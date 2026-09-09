# Production Hardening (Short Batch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make free-trial and rate limits durable across Vercel instances via optional Upstash Redis, split client-safe error helpers away from `@/lib/ai`, and finish generic error toasts in final-review.

**Architecture:** Thin `lib/kv.ts` returns an Upstash client or `null`. Trial and rate-limit modules keep the same call-site names but become async and dual-write Redis when configured, falling back to in-memory Maps. `lib/user-errors.ts` owns browser-safe messages; clients import only that file.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@upstash/redis`, existing `RateLimitError` + cookie trial flow.

**Spec:** `docs/superpowers/specs/2026-09-09-production-hardening-design.md`

## Global Constraints

- Soft fallback: missing `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` → in-memory behavior (no local Redis install).
- Do not change trial semantics: 1 flow/UTC day, 3h flow window, parse does not consume trial.
- Clients must not import `@/lib/ai` via error helpers.
- User-facing copy never mentions API keys or providers.
- Conventional commits on feature branch `feat/production-hardening-limits`; do not push to `main`; agent does not open PRs.
- Verify with `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` (no new test harness).

## File map

| File                            | Responsibility                                                     |
| ------------------------------- | ------------------------------------------------------------------ |
| `lib/kv.ts`                     | Optional Upstash Redis singleton                                   |
| `lib/trial.ts`                  | Free-trial gate + cookies + Redis dual-write                       |
| `lib/rate-limit.ts`             | Sliding-window limits (memory or Redis)                            |
| `lib/user-errors.ts`            | `USER_ERRORS`, `ActionResult`, client-safe `publicActionError`     |
| `lib/action-errors.ts`          | Re-export from `user-errors` for server convenience                |
| `app/actions.ts`                | `await` async rate-limit / trial (trial already async)             |
| `app/api/parse-cv/route.ts`     | `await assertParseRateLimit`                                       |
| `app/api/structure-cv/route.ts` | `await assertFreeTrialFlowFromRequest`, `await assertLlmRateLimit` |
| Client components               | Import `@/lib/user-errors`                                         |
| `components/final-review.tsx`   | Generic toasts                                                     |
| `.env.example`, `AGENTS.md`     | Document Upstash env vars                                          |
| `package.json`                  | Add `@upstash/redis`                                               |

---

### Task 1: Optional Upstash client (`lib/kv.ts`)

**Files:**

- Create: `lib/kv.ts`
- Modify: `package.json` (via `pnpm add @upstash/redis`)
- Modify: `.env.example`
- Modify: `AGENTS.md` (env table)

**Interfaces:**

- Produces: `getRedis(): Redis | null`

- [ ] **Step 1: Install dependency**

```bash
pnpm add @upstash/redis
```

Expected: `@upstash/redis` listed in `package.json` dependencies.

- [ ] **Step 2: Create `lib/kv.ts`**

```ts
import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

/**
 * Shared Upstash Redis client, or null when env is unset (memory fallback).
 * No local Redis server required.
 */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    cached = null;
    return cached;
  }

  cached = new Redis({ url, token });
  return cached;
}
```

- [ ] **Step 3: Document env in `.env.example`**

Add after the rate-limit block:

```bash
# ── Durable trial / rate limits (optional, recommended in production) ─
# Free Upstash Redis: https://console.upstash.com (REST URL + token).
# If unset, limits use in-memory Maps (fine for local/CI; weak on multi-instance Vercel).
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 4: Document in `AGENTS.md` under Environment variables**

Add a short subsection listing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as optional for production durable limits.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml lib/kv.ts .env.example AGENTS.md
git commit -m "$(cat <<'EOF'
feat: add optional Upstash Redis client for durable limits

EOF
)"
```

---

### Task 2: Redis-backed rate limits (async API)

**Files:**

- Modify: `lib/rate-limit.ts`
- Modify: `app/actions.ts` (await `assertLlmRateLimit`)
- Modify: `app/api/parse-cv/route.ts`
- Modify: `app/api/structure-cv/route.ts`

**Interfaces:**

- Consumes: `getRedis()` from `lib/kv.ts`
- Produces:
  - `assertRateLimit(options): Promise<void>`
  - `assertParseRateLimit(clientId: string): Promise<void>`
  - `assertLlmRateLimit(clientId: string, action: string): Promise<void>`
  - `RateLimitError`, `isRateLimitError`, `rateLimitConfig` unchanged otherwise

- [ ] **Step 1: Rewrite `lib/rate-limit.ts` with memory + Redis paths**

Keep the file header updated to mention Upstash soft fallback. Core logic:

```ts
import { getRedis } from "@/lib/kv";

// ... RateLimitError, readLimit, rateLimitConfig, buckets Map unchanged ...

function assertRateLimitMemory(options: {
  key: string;
  limit: number;
  windowMs: number;
}): void {
  // existing sync Map logic (unchanged body)
}

async function assertRateLimitRedis(
  redis: NonNullable<ReturnType<typeof getRedis>>,
  options: { key: string; limit: number; windowMs: number }
): Promise<void> {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const redisKey = `cvj:rl:${options.key}`;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  await redis.zremrangebyscore(redisKey, 0, windowStart);
  const count = await redis.zcard(redisKey);
  if (count >= options.limit) {
    const oldest = await redis.zrange<string[]>(redisKey, 0, 0, { withScores: true });
    // Upstash may return [{ score, member }] or flat pairs depending on version —
    // parse the lowest score safely; fallback retry = windowMs/1000
    let oldestScore = now;
    if (Array.isArray(oldest) && oldest.length > 0) {
      const first = oldest[0] as unknown;
      if (typeof first === "object" && first && "score" in first) {
        oldestScore = Number((first as { score: number }).score) || now;
      } else if (typeof first === "number") {
        oldestScore = first;
      }
    }
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldestScore + options.windowMs - now) / 1000)
    );
    throw new RateLimitError(
      "We're a bit busy right now. Please wait a moment and try again.",
      retryAfterSec
    );
  }

  await redis.zadd(redisKey, { score: now, member });
  await redis.pexpire(redisKey, options.windowMs);
}

export async function assertRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    assertRateLimitMemory(options);
    return;
  }
  await assertRateLimitRedis(redis, options);
}

export async function assertParseRateLimit(clientId: string): Promise<void> {
  await assertRateLimit({
    key: `parse:${clientId}`,
    limit: rateLimitConfig.parsePerHour(),
    windowMs: 60 * 60 * 1000,
  });
}

export async function assertLlmRateLimit(
  clientId: string,
  action: string
): Promise<void> {
  await assertRateLimit({
    key: `llm-h:${clientId}`,
    limit: rateLimitConfig.llmPerHour(),
    windowMs: 60 * 60 * 1000,
  });
  await assertRateLimit({
    key: `llm-d:${clientId}`,
    limit: rateLimitConfig.llmPerDay(),
    windowMs: 24 * 60 * 60 * 1000,
  });
  await assertRateLimit({
    key: `llm-a:${action}:${clientId}`,
    limit: Math.max(5, Math.floor(rateLimitConfig.llmPerHour() / 2)),
    windowMs: 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Await call sites**

In `app/actions.ts` inside lock callbacks:

```ts
await assertLlmRateLimit(clientId, "analyze");
// and
await assertLlmRateLimit(clientId, "rewrites");
```

In `app/api/parse-cv/route.ts`:

```ts
await assertParseRateLimit(getClientIpFromRequest(req));
```

In `app/api/structure-cv/route.ts` inside the lock:

```ts
await assertLlmRateLimit(clientId, "structure");
```

- [ ] **Step 3: Verify**

```bash
pnpm exec tsc --noEmit --incremental false
pnpm lint
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/rate-limit.ts app/actions.ts app/api/parse-cv/route.ts app/api/structure-cv/route.ts
git commit -m "$(cat <<'EOF'
feat: back rate limits with optional Upstash Redis

EOF
)"
```

---

### Task 3: Redis-backed free trial (async from-request)

**Files:**

- Modify: `lib/trial.ts`
- Modify: `app/api/structure-cv/route.ts` (await trial assert)

**Interfaces:**

- Consumes: `getRedis()`, `RateLimitError`
- Produces (signatures):
  - `assertFreeTrialFlow(clientId: string): Promise<void>` (already async)
  - `assertFreeTrialFlowFromRequest(req, clientId): Promise<{ flowUntil; trialDay; startedNew }>`
  - `appendTrialCookies`, `isTrialLimitError` unchanged

- [ ] **Step 1: Add Redis helpers inside `lib/trial.ts`**

```ts
import { getRedis } from "@/lib/kv";

type TrialState = { flowUntil: number; trialDay: string };

function trialRedisKey(clientId: string): string {
  return `cvj:trial:${clientId}`;
}

async function readTrialRedis(clientId: string): Promise<TrialState | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<TrialState | string>(trialRedisKey(clientId));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as TrialState;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && raw && "flowUntil" in raw && "trialDay" in raw) {
    return raw as TrialState;
  }
  return null;
}

async function writeTrialRedis(clientId: string, state: TrialState): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(trialRedisKey(clientId), state, { ex: 60 * 60 * 36 });
}
```

- [ ] **Step 2: Update `assertFreeTrialFlow` read/write order**

When computing active flow / used day, take `Math.max` of cookie, memory map, and Redis `flowUntil`; for trial day prefer cookie, else Redis, else memory.

On start of new flow: `ipFlows.set`, cookie set (existing), and `await writeTrialRedis(clientId, { flowUntil, trialDay: day })`.

When active Redis flow exists but cookies are stale, still allow (return early) — do not require cookies.

- [ ] **Step 3: Make `assertFreeTrialFlowFromRequest` async**

Same merge of cookie + memory + Redis. On `startedNew`, write memory + Redis (cookies still via `appendTrialCookies` on the response).

Update `structure-cv/route.ts`:

```ts
trialMeta = await assertFreeTrialFlowFromRequest(req, clientId);
```

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit --incremental false
pnpm lint
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/trial.ts app/api/structure-cv/route.ts
git commit -m "$(cat <<'EOF'
feat: persist free-trial flow in optional Upstash Redis

EOF
)"
```

---

### Task 4: Client-safe `lib/user-errors.ts` + rewire imports

**Files:**

- Create: `lib/user-errors.ts`
- Modify: `lib/action-errors.ts`
- Modify: `components/keyword-analysis.tsx`
- Modify: `components/ai-rewrites.tsx`
- Modify: `components/upload-cv.tsx`
- Modify: `components/linkedin-suggestions.tsx`
- Keep server imports of `@/lib/action-errors` in `app/actions.ts`, `parse-cv`, `structure-cv` (re-exports OK)

**Interfaces:**

- Produces from `lib/user-errors.ts`:
  - `USER_ERRORS` (same strings as today)
  - `ActionResult<T>`
  - `publicActionError(error: unknown): string` — no import of `@/lib/ai`; detect missing keys via string heuristics (`REQUIRE_KEY`, `api key`, `401`, `Unauthorized`); detect rate limit via `name === "RateLimitError"` duck-typing + message, not via importing `RateLimitError` class if that pulls heavy deps — duck-type only is fine
- `lib/action-errors.ts` becomes:

```ts
export { USER_ERRORS, publicActionError, type ActionResult } from "@/lib/user-errors";
```

- [ ] **Step 1: Move current `action-errors.ts` body into `lib/user-errors.ts`**, replacing `isLlmErrorMissingKey` with:

```ts
function isMissingKeyText(error: unknown, fullText: string): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const blob = `${msg}\n${fullText}`.toLowerCase();
  return (
    fullText.includes("REQUIRE_KEY") ||
    blob.includes("api key") ||
    blob.includes("401") ||
    blob.includes("unauthorized")
  );
}
```

Replace `isRateLimitError` import with local duck-type matching existing `isRateLimitError` shape (name + optional message).

- [ ] **Step 2: Slim `lib/action-errors.ts` to re-exports only**

- [ ] **Step 3: Point client components at `@/lib/user-errors`**

```ts
import { publicActionError, USER_ERRORS } from "@/lib/user-errors";
```

(`upload-cv` / `linkedin-suggestions` only need `publicActionError`.)

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit --incremental false
pnpm lint
```

Expected: exit 0. Confirm no client file imports `@/lib/action-errors`.

- [ ] **Step 5: Commit**

```bash
git add lib/user-errors.ts lib/action-errors.ts components/keyword-analysis.tsx components/ai-rewrites.tsx components/upload-cv.tsx components/linkedin-suggestions.tsx
git commit -m "$(cat <<'EOF'
refactor: split client-safe user errors away from AI imports

EOF
)"
```

---

### Task 5: Generic final-review toasts + full quality gate

**Files:**

- Modify: `components/final-review.tsx`

- [ ] **Step 1: Import `USER_ERRORS` and replace toasts**

```ts
import { USER_ERRORS } from "@/lib/user-errors";
```

Structuring failure:

```ts
toast.error(USER_ERRORS.unavailable, { id: "struct-fail" });
```

PDF catch:

```ts
} catch (error: unknown) {
  console.error("PDF generation failed:", error);
  toast.error(USER_ERRORS.generic, {
    id: "pdf-toast",
    duration: 5000,
  });
}
```

Do not surface `error.message` to the user.

- [ ] **Step 2: Full verification**

```bash
pnpm lint
pnpm format:check
pnpm exec tsc --noEmit --incremental false
pnpm build
```

Expected: all exit 0. Build may use existing CI-style env; if build needs env, set:

```bash
NEXT_PUBLIC_SITE_URL=https://example.com NEXT_PUBLIC_SEO_INDEX=false NEXT_PUBLIC_ENABLE_DEMO=false LLM_PROVIDER=groq GROQ_API_KEY=ci-placeholder pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add components/final-review.tsx
git commit -m "$(cat <<'EOF'
fix: use generic error toasts on final review

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement                      | Task           |
| ------------------------------------- | -------------- |
| `lib/kv.ts` + soft fallback           | 1              |
| Upstash env docs                      | 1              |
| Redis rate limits + async call sites  | 2              |
| Redis trial + cookies dual-write      | 3              |
| `lib/user-errors.ts` / client imports | 4              |
| final-review generic toasts           | 5              |
| Quality scripts                       | 5              |
| No paid unlock / Sentry / E2E         | (out of scope) |

## Execution note

Prefer **inline execution** (`executing-plans`) in this session unless the user asks for subagent-driven development. After implementation, push the feature branch only if the user asks; user opens the PR.
