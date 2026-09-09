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
