import { groq } from "@ai-sdk/groq";
import { asAiSdkModel, type LlmProviderAdapter } from "../types";

/**
 * Free Groq chat model. Structured JSON is handled by generateStructured
 * (text + parse), so json_schema support is not required.
 */
export const groqProvider: LlmProviderAdapter = {
  id: "groq",
  defaultModelId: "llama-3.3-70b-versatile",
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
