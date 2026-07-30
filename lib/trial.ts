/**
 * One free "start-to-finish" optimize flow per visitor.
 *
 * - First LLM call starts a flow (cookie + IP) and marks the daily trial used.
 * - Analyze + rewrites (+ structure) inside the same flow window are allowed.
 * - Starting another optimize after that is blocked until the next day.
 *
 * Upload/parse stays lightly rate-limited separately — it does not consume the trial.
 */

import { cookies } from "next/headers";
import { RateLimitError } from "@/lib/rate-limit";

const FLOW_COOKIE = "cvj_flow";
const TRIAL_COOKIE = "cvj_trial_day";

/** Temporary free-trial caps — hard-coded until paid unlocks replace this. */
const FREE_TRIAL_FLOWS_PER_DAY = 1;
const FREE_TRIAL_FLOW_HOURS = 3;

/** In-memory backup when cookies are missing (same server instance). */
const ipFlows = new Map<string, { flowUntil: number; trialDay: string }>();

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // UTC day
}

function flowTtlMs(): number {
  return FREE_TRIAL_FLOW_HOURS * 60 * 60 * 1000;
}

function flowsPerDay(): number {
  return FREE_TRIAL_FLOWS_PER_DAY;
}

export function isTrialLimitError(error: unknown): error is RateLimitError {
  return (
    error instanceof RateLimitError && error.message.toLowerCase().includes("free trial")
  );
}

function trialBlockedMessage(): string {
  return "You've used the free trial. Try again later.";
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function readFlowUntil(store: CookieStore, clientId: string, now: number): number {
  const fromCookie = Number(store.get(FLOW_COOKIE)?.value || 0);
  const fromIp = ipFlows.get(clientId)?.flowUntil ?? 0;
  const until = Math.max(fromCookie, fromIp);
  return until > now ? until : 0;
}

function readTrialDay(store: CookieStore, clientId: string): string {
  return store.get(TRIAL_COOKIE)?.value || ipFlows.get(clientId)?.trialDay || "";
}

/**
 * Call inside LLM work (after cache miss). Allows one active flow to finish;
 * blocks a second optimize journey the same day.
 */
export async function assertFreeTrialFlow(clientId: string): Promise<void> {
  const store = await cookies();
  const now = Date.now();
  const day = todayKey();
  const activeUntil = readFlowUntil(store, clientId, now);

  // Same in-progress flow — allow analyze + rewrites + structure
  if (activeUntil > now) {
    return;
  }

  const usedDay = readTrialDay(store, clientId);
  // Simple MVP: 1 flow/day. (flowsPerDay > 1 reserved for later paid tiers)
  if (usedDay === day && flowsPerDay() <= 1) {
    const endOfUtcDay =
      Date.UTC(
        Number(day.slice(0, 4)),
        Number(day.slice(5, 7)) - 1,
        Number(day.slice(8, 10)) + 1
      ) / 1000;
    const retryAfterSec = Math.max(60, Math.floor(endOfUtcDay - now / 1000));
    throw new RateLimitError(trialBlockedMessage(), retryAfterSec);
  }

  // Start a new free flow
  const flowUntil = now + flowTtlMs();
  const secure = process.env.NODE_ENV === "production";
  const maxAgeFlow = Math.ceil(flowTtlMs() / 1000);
  const maxAgeTrial = 60 * 60 * 36; // cover UTC day boundary

  try {
    store.set(FLOW_COOKIE, String(flowUntil), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: maxAgeFlow,
    });
    store.set(TRIAL_COOKIE, day, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: maxAgeTrial,
    });
  } catch {
    // Cookie set can fail outside a mutable request context — IP map still applies.
  }

  ipFlows.set(clientId, { flowUntil, trialDay: day });
}

/** For Route Handlers that receive a Request (set cookies on the Response). */
export function assertFreeTrialFlowFromRequest(
  req: Request,
  clientId: string
): { flowUntil: number; trialDay: string; startedNew: boolean } {
  const now = Date.now();
  const day = todayKey();
  const cookieHeader = req.headers.get("cookie") || "";
  const flowMatch = cookieHeader.match(new RegExp(`${FLOW_COOKIE}=([^;]+)`));
  const trialMatch = cookieHeader.match(new RegExp(`${TRIAL_COOKIE}=([^;]+)`));
  const cookieFlowUntil = Number(flowMatch?.[1] || 0);
  const cookieTrialDay = decodeURIComponent(trialMatch?.[1] || "");
  const ip = ipFlows.get(clientId);
  const activeUntil = Math.max(cookieFlowUntil, ip?.flowUntil ?? 0);

  if (activeUntil > now) {
    return {
      flowUntil: activeUntil,
      trialDay: cookieTrialDay || ip?.trialDay || day,
      startedNew: false,
    };
  }

  const usedDay = cookieTrialDay || ip?.trialDay || "";
  if (usedDay === day && flowsPerDay() <= 1) {
    const endOfUtcDay =
      Date.UTC(
        Number(day.slice(0, 4)),
        Number(day.slice(5, 7)) - 1,
        Number(day.slice(8, 10)) + 1
      ) / 1000;
    const retryAfterSec = Math.max(60, Math.floor(endOfUtcDay - now / 1000));
    throw new RateLimitError(trialBlockedMessage(), retryAfterSec);
  }

  const flowUntil = now + flowTtlMs();
  ipFlows.set(clientId, { flowUntil, trialDay: day });
  return { flowUntil, trialDay: day, startedNew: true };
}

export function appendTrialCookies(
  headers: Headers,
  trial: { flowUntil: number; trialDay: string; startedNew: boolean }
): void {
  if (!trial.startedNew) return;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const flowMax = Math.ceil(flowTtlMs() / 1000);
  headers.append(
    "Set-Cookie",
    `${FLOW_COOKIE}=${trial.flowUntil}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${flowMax}${secure}`
  );
  headers.append(
    "Set-Cookie",
    `${TRIAL_COOKIE}=${trial.trialDay}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 36}${secure}`
  );
}
