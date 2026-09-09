# Production hardening (short batch) — Design

**Date:** 2026-09-09  
**Status:** Approved for planning (pending user review of this file)  
**Scope:** Durable free-trial + rate limits (Upstash), client-safe error split, generic error copy cleanup

## Problem

CVJungle already gates usage with a free-trial flow and secondary LLM/parse rate limits, and sanitizes many AI errors for the UI. Two production gaps remain:

1. **In-memory limits are not multi-instance safe.** On Vercel, serverless instances do not share process `Map`s in `lib/trial.ts` and `lib/rate-limit.ts`. A user can get extra free flows or burst past LLM caps by hitting different instances. Cookies help trial a little but are clearable and do not cover sliding-window LLM/parse buckets.

2. **Error-surface inconsistencies.** Client components import `lib/action-errors.ts`, which pulls `@/lib/ai` (provider SDKs) into the client graph. `final-review` still surfaces “check your API key” / raw PDF error messages, which fights the generic-error goal.

## Goals

- Make trial + rate limits trustworthy across Vercel instances when Upstash is configured.
- Keep local/CI working with **no Redis install** and **no Upstash required** (soft fallback to today’s in-memory maps).
- Keep existing call sites (`assertFreeTrialFlow*`, `assertLlmRateLimit`, `assertParseRateLimit`) stable.
- Split user-facing error helpers so clients never import `@/lib/ai`.
- Finish generic error copy in the final-review UI.

## Non-goals

- Paid unlock / auth
- Sentry or other observability product
- SEO / Search Console ops
- Automated E2E of the full wizard
- Requiring a local Redis server

## Why Upstash (and why not local Redis)

Upstash Redis over HTTPS is a **shared store** for all serverless instances. It is necessary for production _trustworthiness_ of limits, not for the app to boot.

- **No local Redis install.** Devs create a free Upstash DB (or skip env vars and use memory fallback).
- **Soft fallback:** if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are missing, behavior matches today’s in-memory maps (fine for `pnpm dev` and CI).

## Architecture

```
Request (parse / structure / analyze / rewrites)
  → clientId (IP)
  → trial assert (Redis if configured, else Map) + cookies dual-write
  → rate-limit assert (Redis if configured, else Map)
  → LLM / parse work
  → public errors via user-errors (client) or action-errors (server + AI key detection)
```

### New / changed modules

| Module                        | Role                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| `lib/kv.ts`                   | Optional Upstash client; returns `null` when env missing                  |
| `lib/trial.ts`                | Same public API; persist trial/flow in Redis when available; keep cookies |
| `lib/rate-limit.ts`           | Same public API; Redis-backed sliding window when available               |
| `lib/user-errors.ts`          | `USER_ERRORS` + client-safe `publicActionError` (no `@/lib/ai`)           |
| `lib/action-errors.ts`        | Re-export user helpers; keep server path that uses `isLlmErrorMissingKey` |
| Client components             | Import `@/lib/user-errors` only                                           |
| `components/final-review.tsx` | Generic toasts only                                                       |

## Data model

### Trial

- Cookies unchanged: `cvj_flow` (flowUntil ms), `cvj_trial_day` (UTC `YYYY-MM-DD`).
- Redis key: `cvj:trial:{clientId}` → JSON `{ trialDay, flowUntil }`, TTL ~36h.
- Semantics unchanged: one free flow per UTC day; active flow window allows analyze + rewrites + structure; upload/parse does not consume trial.

**Read order:** allow if Redis or cookie shows active `flowUntil > now`; else block if `trialDay === today`; else start flow (write Redis + Set-Cookie).

### Rate limits

- Same keys/semantics as today (`parse:…`, `llm-h:…`, `llm-d:…`, `llm-a:…`).
- Redis key prefix: `cvj:rl:{bucketKey}` storing event timestamps for the sliding window (list or zset), TTL = window length.
- Env-tunable limits unchanged (`RATE_LIMIT_*`).

## Environment

```bash
# Optional — production should set both for durable limits
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Document in `.env.example` and `AGENTS.md`. CI build does not require them.

Dependency: `@upstash/redis`.

## Error handling

- Users never see provider names, API key hints, or stack traces.
- `USER_ERRORS`: `generic`, `unavailable`, `busy`, `trial`, `missingRole`, `missingCv`, `missingData`.
- `final-review`: structuring failure → `USER_ERRORS.unavailable` (or generic); PDF failure → `USER_ERRORS.generic` (log details server/console only).

## Testing / verification

- No new heavy test harness required if none exists.
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`.
- Manual: Upstash unset → same as today; Upstash set → second same-day flow blocked after process restart.

## Rollout

- Work on a feature branch; conventional commits; do not push to `main`.
- Agent does not open GitHub PRs; user opens the PR.
- After merge/release: set Upstash vars on Vercel production.

## Success criteria

1. With Upstash configured, trial + rate limits are shared across instances.
2. Without Upstash, app still runs (memory fallback).
3. Client bundles do not import `@/lib/ai` via error helpers.
4. Final-review toasts match generic error policy.
5. Quality scripts pass.
