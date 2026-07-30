import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate-structured";
import { isLlmErrorMissingKey } from "@/lib/ai";
import { textFingerprint, withRequestLock } from "@/lib/request-lock";
import { getClientIpFromRequest } from "@/lib/client-ip";
import { assertLlmRateLimit, isRateLimitError } from "@/lib/rate-limit";
import { assertFreeTrialFlowFromRequest, appendTrialCookies } from "@/lib/trial";
import { USER_ERRORS } from "@/lib/action-errors";
import { polishGrammar, sanitizeAiText } from "@/lib/text-style";

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
    let trialMeta: {
      flowUntil: number;
      trialDay: string;
      startedNew: boolean;
    } | null = null;

    const object = await withRequestLock(lockKey, async () => {
      trialMeta = assertFreeTrialFlowFromRequest(req, clientId);
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
Do not use em dashes, en dashes, or spaced hyphens as punctuation; use commas or periods.

CV TEXT:
${String(text).substring(0, 12000)}`,
      });
    });

    const cleaned = {
      ...object,
      summary: polishGrammar(sanitizeAiText(object.summary || "")),
      skills: (object.skills || []).map((s) => sanitizeAiText(s)).filter(Boolean),
      experience: (object.experience || []).map((exp) => ({
        ...exp,
        company: sanitizeAiText(exp.company || ""),
        role: sanitizeAiText(exp.role || ""),
        duration: sanitizeAiText(exp.duration || ""),
        description: (exp.description || [])
          .map((b) => polishGrammar(sanitizeAiText(b)))
          .filter(Boolean),
      })),
      education: (object.education || []).map((edu) => ({
        ...edu,
        institution: sanitizeAiText(edu.institution || ""),
        degree: sanitizeAiText(edu.degree || ""),
        year: sanitizeAiText(edu.year || ""),
      })),
    };

    const headers = new Headers({ "Content-Type": "application/json" });
    if (trialMeta) appendTrialCookies(headers, trialMeta);

    return new Response(JSON.stringify(cleaned), { headers });
  } catch (error: unknown) {
    console.error("CV Structuring error detail:", error);

    if (isRateLimitError(error)) {
      const message = error.message.toLowerCase().includes("free trial")
        ? USER_ERRORS.trial
        : USER_ERRORS.busy;
      return new Response(JSON.stringify({ error: message, code: "RATE_LIMIT" }), {
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
          error: USER_ERRORS.unavailable,
          code: "INVALID_API_KEY",
        }),
        { status: 401 }
      );
    }

    return new Response(JSON.stringify({ error: USER_ERRORS.generic }), {
      status: 500,
    });
  }
}
