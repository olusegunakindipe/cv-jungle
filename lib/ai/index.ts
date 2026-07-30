import type { AiSdkLanguageModel, LlmProviderAdapter, LlmProviderId } from "./types";
import { openaiProvider } from "./providers/openai";
import { groqProvider } from "./providers/groq";
import { googleProvider } from "./providers/google";
import { ollamaProvider } from "./providers/ollama";

/**
 * Registry of LLM adapters.
 * Add a new provider → implement LlmProviderAdapter → register here.
 * App logic never changes.
 */
const PROVIDERS: Record<LlmProviderId, LlmProviderAdapter> = {
  openai: openaiProvider,
  groq: groqProvider,
  google: googleProvider,
  ollama: ollamaProvider,
};

export type { AiSdkLanguageModel, LlmProviderAdapter, LlmProviderId } from "./types";
export { asAiSdkModel } from "./types";

export function getActiveProvider(): LlmProviderAdapter {
  const raw = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const id = (raw in PROVIDERS ? raw : "openai") as LlmProviderId;
  return PROVIDERS[id];
}

/**
 * The only function business logic should call.
 * Switch models/providers entirely via .env.local — no code changes needed.
 */
export function getModel(): AiSdkLanguageModel {
  const provider = getActiveProvider();
  provider.assertConfigured();
  const modelId = process.env.LLM_MODEL || provider.defaultModelId;
  return provider.createModel(modelId);
}

export function isLlmErrorMissingKey(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("REQUIRE_KEY") ||
    msg.includes("API key") ||
    msg.includes("api key") ||
    msg.includes("401") ||
    msg.includes("Unauthorized")
  );
}
