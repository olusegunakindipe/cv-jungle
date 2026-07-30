import type { generateObject } from "ai";

/**
 * Model type accepted by Vercel AI SDK helpers (generateObject / generateText).
 * Kept as a Parameters<> extract so we stay compatible across provider major bumps
 * (LanguageModelV2 / V3 / V4) without rewriting business logic.
 */
export type AiSdkLanguageModel = Parameters<typeof generateObject>[0]["model"];

/**
 * Provider adapter contract.
 * Business logic never imports OpenAI/Groq/Google directly — only getModel().
 * To add a new LLM: implement this interface and register it in lib/ai/index.ts.
 */
export interface LlmProviderAdapter {
  /** Env value for LLM_PROVIDER, e.g. "groq" */
  readonly id: string;
  /** Default model when LLM_MODEL is unset */
  readonly defaultModelId: string;
  /** Throw REQUIRE_KEY-style error if credentials are missing */
  assertConfigured(): void;
  /** Return a model instance usable with generateObject / generateText */
  createModel(modelId?: string): AiSdkLanguageModel;
}

export type LlmProviderId = "openai" | "groq" | "google" | "ollama";

/** Narrow any provider SDK return value to the AI SDK model union safely. */
export function asAiSdkModel(model: unknown): AiSdkLanguageModel {
  return model as AiSdkLanguageModel;
}
