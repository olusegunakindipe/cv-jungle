import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai";

/**
 * Provider-safe structured generation via text → JSON parse → Zod.
 * Single LLM call by default (no automatic retries) to protect free-tier quotas.
 */

/** Common LLM JSON messes: trailing commas, smart quotes, BOM. */
function repairJsonText(text: string): string {
  let s = text.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  // Smart quotes → ASCII
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

function tryParse(text: string): unknown {
  return JSON.parse(repairJsonText(text));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Model returned an empty response");

  try {
    return tryParse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return tryParse(fenced[1].trim());
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

  try {
    return tryParse(candidate.slice(0, end + 1));
  } catch (err) {
    // Truncated output often leaves an open string/object — surface a clear retryable error
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid or truncated JSON from model: ${msg}`);
  }
}

export async function generateStructured<T extends z.ZodType>({
  schema,
  prompt,
  system,
  schemaHint,
  /** Keep 1 to save cost. Only raise for critical paths. */
  maxAttempts = 1,
  maxOutputTokens = 4096,
}: {
  schema: T;
  prompt: string;
  system?: string;
  schemaHint?: string;
  maxAttempts?: number;
  maxOutputTokens?: number;
}): Promise<z.infer<T>> {
  const model = getModel();
  const systemPrompt =
    system ??
    "You are a careful JSON generator. Reply with ONLY valid JSON. No markdown, no commentary, no code fences. Keep strings short. Never truncate mid-string.";

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
Return ONLY corrected valid JSON. No markdown. Keep the response compact so it is not truncated.

Previous reply:
${previousText.slice(0, 4000)}

Original task:
${taskPrompt}`,
      temperature: 0.2,
      // Cap output so Groq TPD reservation stays modest (8k burned unused quota).
      maxOutputTokens,
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
