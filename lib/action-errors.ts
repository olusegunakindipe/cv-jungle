import { isLlmErrorMissingKey } from "@/lib/ai";
import { isRateLimitError } from "@/lib/rate-limit";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Short, generic copy for end users — no env vars, providers, or stack details. */
export const USER_ERRORS = {
  generic: "Something went wrong. Please try again.",
  unavailable: "Optimization is temporarily unavailable. Please try again later.",
  busy: "We're a bit busy right now. Please wait a moment and try again.",
  trial: "You've used the free trial. Try again later.",
  missingRole: "Please choose a target role first.",
  missingCv: "Please upload your CV first.",
  missingData: "Please upload your CV and choose a target role first.",
} as const;

function collectErrorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error ?? "");
  const parts = [error.message];
  const nested = error as Error & {
    lastError?: unknown;
    cause?: unknown;
    errors?: unknown[];
  };
  if (nested.lastError) parts.push(collectErrorText(nested.lastError));
  if (nested.cause) parts.push(collectErrorText(nested.cause));
  if (Array.isArray(nested.errors)) {
    for (const e of nested.errors) parts.push(collectErrorText(e));
  }
  return parts.filter(Boolean).join("\n");
}

function isProviderQuota(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("tokens per day") ||
    lower.includes("tpm") ||
    lower.includes("tpd") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  );
}

function isFriendlyUserMessage(msg: string): boolean {
  const known = Object.values(USER_ERRORS);
  if (known.includes(msg as (typeof known)[number])) return true;
  const lower = msg.toLowerCase();
  return (
    lower.includes("free trial") ||
    lower.includes("usage limit") ||
    lower.includes("try again") ||
    lower.includes("please upload") ||
    lower.includes("please choose") ||
    lower.includes("too short") ||
    lower.includes("too large") ||
    lower.includes("unsupported file") ||
    lower.includes("password protected")
  );
}

/** Safe message for the browser — never expose provider/env/stack details. */
export function publicActionError(error: unknown): string {
  if (isRateLimitError(error)) {
    if (error.message.toLowerCase().includes("free trial")) {
      return USER_ERRORS.trial;
    }
    return USER_ERRORS.busy;
  }

  const fullText = collectErrorText(error);
  const lower = fullText.toLowerCase();

  if (lower.includes("free trial")) {
    return USER_ERRORS.trial;
  }

  if (isLlmErrorMissingKey(error) || fullText.includes("REQUIRE_KEY")) {
    return USER_ERRORS.unavailable;
  }

  if (isProviderQuota(fullText)) {
    return USER_ERRORS.busy;
  }

  if (
    lower.includes("server components") ||
    lower.includes("digest") ||
    lower.includes("omitted in production")
  ) {
    return USER_ERRORS.generic;
  }

  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg && msg.length < 160 && !msg.includes("\n") && isFriendlyUserMessage(msg)) {
      return msg;
    }
  }

  return USER_ERRORS.generic;
}
