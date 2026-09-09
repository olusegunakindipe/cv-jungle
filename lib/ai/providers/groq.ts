import { groq } from "@ai-sdk/groq";
import { asAiSdkModel, type LlmProviderAdapter } from "../types";

/**
 * Free Groq chat model. Structured JSON is handled by generateStructured
 * (text + parse), so json_schema support is not required.
 *
 * Default follows Groq's post-2026-08-16 replacement for llama-3.3-70b-versatile.
 * Override with LLM_MODEL if needed (e.g. openai/gpt-oss-20b, qwen/qwen3.6-27b).
 */
export const groqProvider: LlmProviderAdapter = {
  id: "groq",
  defaultModelId: "openai/gpt-oss-120b",
  assertConfigured() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "REQUIRE_KEY: Set GROQ_API_KEY. Free key: https://console.groq.com/keys"
      );
    }
  },
  createModel(modelId) {
    return asAiSdkModel(groq(modelId || this.defaultModelId));
  },
};
