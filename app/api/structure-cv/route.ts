import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate-structured";
import { isLlmErrorMissingKey } from "@/lib/ai";
import { textFingerprint, withRequestLock } from "@/lib/request-lock";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { assertLlmRateLimit, isRateLimitError } from "@/lib/rate-limit";

const structuredCvSchema = z.object({
  name: z.string().catch(""),
  email: z.string().catch(""),
  phone: z.string().catch(""),
  location: z.string().catch(""),
  summary: z.string().catch(""),
  experience: z
    .array(
      z.object({
        company: z.string().catch(""),
        role: z.string().catch(""),
        duration: z.string().catch(""),
        description: z.array(z.string()).catch([]),
      })
    )
    .catch([]),
  skills: z.array(z.string()).catch([]),
  education: z
    .array(
      z.object({
        institution: z.string().catch(""),
        degree: z.string().catch(""),
        year: z.string().catch(""),
      })
    )
    .catch([]),
});

const SCHEMA_HINT = `{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "description": ["bullet point 1", "bullet point 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "education": [
    { "institution": "string", "degree": "string", "year": "string" }
  ]
}`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.length < 10) {
      return new Response(
        JSON.stringify({
          error: "CV text is too short to structure accurately.",
        }),
        { status: 400 }
      );
    }

    const lockKey = `structure-cv:${textFingerprint(String(text))}`;
    const clientId = getClientIpFromRequest(req);

    const object = await withRequestLock(lockKey, async () => {
      assertLlmRateLimit(clientId, "structure");
      return generateStructured({
        schema: structuredCvSchema,
        schemaHint: SCHEMA_HINT,
        maxAttempts: 1,
        prompt: `Extract structured CV data from the following raw text.
Group experience bullet points under the correct role.
Keep ALL meaningful achievement bullets for each role — do not drop or summarize them away.
If a field is missing in the source, use "" or [].
Do not invent employers, dates, degrees, or achievements.

CV TEXT:
${String(text).substring(0, 12000)}`,
      });
    });

    return new Response(JSON.stringify(object), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("CV Structuring error detail:", error);

    if (isRateLimitError(error)) {
      return new Response(JSON.stringify({ error: error.message, code: "RATE_LIMIT" }), {
        status: 429,
        headers: {
          "Retry-After": String(error.retryAfterSec),
          "Content-Type": "application/json",
        },
      });
    }

    if (isLlmErrorMissingKey(error)) {
      return new Response(
        JSON.stringify({
          error:
            "LLM API key missing or invalid. Configure LLM_PROVIDER and the matching key in .env.local.",
          code: "INVALID_API_KEY",
        }),
        { status: 401 }
      );
    }

    return new Response(JSON.stringify({ error: "Failed to structure CV." }), {
      status: 500,
    });
  }
}
