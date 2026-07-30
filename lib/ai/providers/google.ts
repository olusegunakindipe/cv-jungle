import { google } from "@ai-sdk/google";
import { asAiSdkModel, type LlmProviderAdapter } from "../types";

export const googleProvider: LlmProviderAdapter = {
  id: "google",
  defaultModelId: "gemini-2.0-flash",
  assertConfigured() {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error(
        "REQUIRE_KEY: Set GOOGLE_GENERATIVE_AI_API_KEY. Free key: https://aistudio.google.com/apikey"
      );
    }
  },

  createModel(modelId) {
    return asAiSdkModel(google(modelId || this.defaultModelId));
  },
};
