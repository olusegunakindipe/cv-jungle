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

function looksLikeRateLimit(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "RateLimitError"
  );
}

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

/** Safe message for the browser — never expose provider/env/stack details. */
export function publicActionError(error: unknown): string {
  if (looksLikeRateLimit(error)) {
    const msg =
      error instanceof Error
        ? error.message
        : String((error as { message?: string }).message ?? "");
    if (msg.toLowerCase().includes("free trial")) {
      return USER_ERRORS.trial;
    }
    return USER_ERRORS.busy;
  }

  const fullText = collectErrorText(error);
  const lower = fullText.toLowerCase();

  if (lower.includes("free trial")) {
    return USER_ERRORS.trial;
  }

  if (isMissingKeyText(error, fullText)) {
    return USER_ERRORS.unavailable;
  }

  // Deprecated / unknown model IDs (e.g. Groq model_not_found) should not look like a random crash.
  if (
    lower.includes("model_not_found") ||
    lower.includes("does not exist") ||
    lower.includes("do not have access to it")
  ) {
    return USER_ERRORS.unavailable;
  }

  if (
    lower.includes("invalid or truncated json") ||
    lower.includes("expected ',' or '}'") ||
    lower.includes("unexpected token") ||
    lower.includes("failed to generate valid structured json")
  ) {
    return USER_ERRORS.generic;
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
