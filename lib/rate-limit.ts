/**
 * Sliding-window rate limiter.
 * Uses Upstash Redis when configured; otherwise in-memory Maps (per instance).
 */

import { getRedis } from "@/lib/kv";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  readonly status = 429;
  readonly retryAfterSec: number;

  constructor(message: string, retryAfterSec: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

function readLimit(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const rateLimitConfig = {
  parsePerHour: () => readLimit("RATE_LIMIT_PARSE_PER_HOUR", 20),
  // Secondary caps — primary gate is one free flow/day (lib/trial.ts)
  llmPerHour: () => readLimit("RATE_LIMIT_LLM_PER_HOUR", 6),
  llmPerDay: () => readLimit("RATE_LIMIT_LLM_PER_DAY", 6),
};

function assertRateLimitMemory(options: {
  key: string;
  limit: number;
  windowMs: number;
}): void {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  let bucket = buckets.get(options.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(options.key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= options.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + options.windowMs - now) / 1000)
    );
    throw new RateLimitError(
      "We're a bit busy right now. Please wait a moment and try again.",
      retryAfterSec
    );
  }

  bucket.timestamps.push(now);

  // Soft cleanup so the map does not grow forever
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.timestamps.every((t) => t <= windowStart)) buckets.delete(k);
    }
  }
}

function oldestScoreFromZrange(oldest: unknown): number | null {
  if (!Array.isArray(oldest) || oldest.length === 0) return null;
  const first = oldest[0] as unknown;
  if (typeof first === "object" && first !== null && "score" in first) {
    const score = Number((first as { score: number }).score);
    return Number.isFinite(score) ? score : null;
  }
  // Flat [member, score, ...] shape
  if (oldest.length >= 2 && typeof oldest[1] === "number") {
    return oldest[1];
  }
  return null;
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
    const oldest = await redis.zrange(redisKey, 0, 0, { withScores: true });
    const oldestScore = oldestScoreFromZrange(oldest) ?? now;
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

/** Parse / upload endpoints — cheaper than LLM, still bounded. */
export async function assertParseRateLimit(clientId: string): Promise<void> {
  await assertRateLimit({
    key: `parse:${clientId}`,
    limit: rateLimitConfig.parsePerHour(),
    windowMs: 60 * 60 * 1000,
  });
}

/**
 * LLM-backed work (structure, analyze, rewrite).
 * Hourly + daily caps. Skipped when withRequestLock serves a cached hit
 * (call this inside the lock callback).
 */
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

export function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    error instanceof RateLimitError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "RateLimitError")
  );
}
