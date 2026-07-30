import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai";

/**
 * Provider-safe structured generation via text → JSON parse → Zod.
 * Single LLM call by default (no automatic retries) to protect free-tier quotas.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Model returned an empty response");

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }

  const start = trimmed.search(/[{[]/);
  if (start < 0) throw new Error("No JSON object found in model response");

  const candidate = trimmed.slice(start);
  const lastObj = candidate.lastIndexOf("}");
  const lastArr = candidate.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end < 0) throw new Error("Incomplete JSON in model response");

  return JSON.parse(candidate.slice(0, end + 1));
}

export async function generateStructured<T extends z.ZodType>({
  schema,
  prompt,
  system,
  schemaHint,
  /** Keep 1 to save cost. Only raise for critical paths. */
  maxAttempts = 1,
}: {
  schema: T;
  prompt: string;
  system?: string;
  schemaHint?: string;
  maxAttempts?: number;
}): Promise<z.infer<T>> {
  const model = getModel();
  const systemPrompt =
    system ??
    "You are a careful JSON generator. Reply with ONLY valid JSON. No markdown, no commentary, no code fences.";

  const taskPrompt = schemaHint
    ? `${prompt}\n\nReturn a JSON object with exactly this shape (use "" or [] when unknown; do not invent facts):\n${schemaHint}`
    : `${prompt}\n\nReturn ONLY valid JSON.`;

  let previousText = "";
  let lastError: unknown;
  const attempts = Math.max(1, Math.min(maxAttempts, 2));

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt:
        attempt === 0
          ? taskPrompt
          : `Your previous reply was not valid JSON (${
              lastError instanceof Error ? lastError.message : String(lastError)
            }).
Return ONLY corrected valid JSON. No markdown.

Previous reply:
${previousText.slice(0, 4000)}

Original task:
${taskPrompt}`,
      temperature: 0.2,
      // Cap output so Groq TPD reservation stays modest (8k burned unused quota).
      maxOutputTokens: 4096,
    });

    previousText = text;
    try {
      const raw = extractJson(text);
      return schema.parse(raw);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to generate valid structured JSON");
}
