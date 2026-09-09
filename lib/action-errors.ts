/**
 * Server-facing re-exports of user-safe action errors.
 * Client components should import from `@/lib/user-errors` instead
 * so they do not pull `@/lib/ai` into the browser bundle.
 */
export { USER_ERRORS, publicActionError, type ActionResult } from "@/lib/user-errors";
