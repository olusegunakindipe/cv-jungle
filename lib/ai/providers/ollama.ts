import { createOpenAI } from "@ai-sdk/openai";
import { asAiSdkModel, type LlmProviderAdapter } from "../types";

/** Local Ollama via OpenAI-compatible API — no cloud key needed. */
export const ollamaProvider: LlmProviderAdapter = {
  id: "ollama",
  defaultModelId: "llama3.2",
  assertConfigured() {
    // Local server; runtime errors surface if Ollama is not running
  },
  createModel(modelId) {
    const client = createOpenAI({
      name: "ollama",
      baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1",
      apiKey: process.env.OLLAMA_API_KEY || "ollama",
    });
    return asAiSdkModel(client(modelId || this.defaultModelId));
  },
};
