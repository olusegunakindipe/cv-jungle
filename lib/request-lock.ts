/**
 * Share in-flight async work + short success cache so retries/remounts
 * do not burn extra LLM quota.
 */
const inflight = new Map<string, Promise<unknown>>();
const successCache = new Map<string, { value: unknown; expires: number }>();

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function withRequestLock<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { ttlMs?: number; cacheSuccess?: boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const cacheSuccess = options?.cacheSuccess !== false;

  const cached = successCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return Promise.resolve(cached.value as T);
  }

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn()
    .then((value) => {
      if (cacheSuccess) {
        successCache.set(key, { value, expires: Date.now() + ttlMs });
      }
      return value;
    })
    .finally(() => {
      setTimeout(() => {
        if (inflight.get(key) === promise) inflight.delete(key);
      }, 300);
    });

  inflight.set(key, promise);
  return promise;
}

/** Clear cached LLM results (e.g. after user resets progress). */
export function clearRequestCaches(prefix?: string) {
  if (!prefix) {
    successCache.clear();
    return;
  }
  for (const key of successCache.keys()) {
    if (key.startsWith(prefix)) successCache.delete(key);
  }
}

/** Stable short key from text (not cryptographic). */
export function textFingerprint(text: string, maxLen = 4000): string {
  const slice = text.slice(0, maxLen);
  let hash = 0;
  for (let i = 0; i < slice.length; i++) {
    hash = (hash * 31 + slice.charCodeAt(i)) | 0;
  }
  return `${slice.length}:${hash}`;
}

/** Include title + seniority + industry so target changes bust LLM caches. */
export function roleFingerprint(
  role:
    | {
        title?: string;
        seniority?: string;
        industry?: string;
      }
    | null
    | undefined
): string {
  if (!role?.title) return "";
  return [
    role.title.trim().toLowerCase(),
    (role.seniority || "").trim().toLowerCase(),
    (role.industry || "").trim().toLowerCase(),
  ].join("|");
}
