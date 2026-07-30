import { openai } from "@ai-sdk/openai";
import { asAiSdkModel, type LlmProviderAdapter } from "../types";

export const openaiProvider: LlmProviderAdapter = {
  id: "openai",
  defaultModelId: "gpt-4o-mini",
  assertConfigured() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "REQUIRE_KEY: Set OPENAI_API_KEY, or set LLM_PROVIDER to groq/google/ollama. See .env.example."
      );
    }
  },
  createModel(modelId) {
    return asAiSdkModel(openai(modelId || this.defaultModelId));
  },
};
