"use server";

import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate-structured";
import { isLlmErrorMissingKey } from "@/lib/ai";
import { textFingerprint, withRequestLock, roleFingerprint } from "@/lib/request-lock";
import { sanitizeAiText, humanizeGeneratedText, polishGrammar } from "@/lib/text-style";
import { getClientIp } from "@/lib/client-ip";
import { assertLlmRateLimit, isRateLimitError } from "@/lib/rate-limit";
import { StructuredCV, RoleDetails, AnalysisResult } from "@/types/cv";

const cvSchema = z.object({
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

const analysisSchema = z.object({
  score: z.number(),
  foundKeywords: z.array(z.string()).catch([]),
  missingKeywords: z.array(z.string()).catch([]),
  summaryAssessment: z.string().catch(""),
  optimizedSummary: z.string().catch(""),
});

export type OptimizationPipelineResult = {
  structuredCV: StructuredCV;
  analysis: AnalysisResult;
};

/**
 * ONE LLM call for step 3.
 * - If structuredCV exists: analyze + write optimized summary only
 * - If only raw text: extract structure + analyze + optimized summary together
 * This cuts step-3 latency and API usage roughly in half.
 */
export async function runOptimizationAnalysisAction(input: {
  parsedText?: string;
  structuredCV?: StructuredCV | null;
  roleDetails: RoleDetails | null;
}): Promise<OptimizationPipelineResult> {
  const { roleDetails } = input;
  if (!roleDetails?.title) {
    throw new Error("Missing target role");
  }
  if (!input.structuredCV && (!input.parsedText || input.parsedText.length < 10)) {
    throw new Error("Missing CV data");
  }

  const roleKey = roleFingerprint(roleDetails);
  const lockKey = input.structuredCV
    ? `opt:existing:${textFingerprint(
        JSON.stringify({
          ...input.structuredCV,
          // Ignore prior summary in fingerprint so retargeting isn't blocked
          summary: "",
        })
      )}:${roleKey}`
    : `opt:raw:${textFingerprint(input.parsedText || "")}:${roleKey}`;

  try {
    return await withRequestLock(lockKey, async () => {
      const clientId = await getClientIp();
      assertLlmRateLimit(clientId, "analyze");

      const roleLine = `${roleDetails.title}${
        roleDetails.seniority ? `, ${roleDetails.seniority}` : ""
      }${roleDetails.industry ? `, ${roleDetails.industry}` : ""}`;

      if (input.structuredCV) {
        // Analyze from facts (experience/skills), not a previous industry-framed summary
        const cvForAnalysis = {
          ...input.structuredCV,
          summary: input.structuredCV.summary?.trim() || "",
        };

        const analysis = await generateStructured({
          schema: analysisSchema,
          maxAttempts: 1,
          schemaHint: `{
  "score": 58,
  "foundKeywords": ["stakeholder management", "budget planning"],
  "missingKeywords": ["cross-functional leadership", "process improvement"],
  "summaryAssessment": "Your CV already shows X. We will rephrase existing bullets for seniority and the target industry so ATS ranks you higher, without inventing new skills.",
  "optimizedSummary": "I am a ... Complete 3-4 sentence FIRST-PERSON summary. Ends with a full sentence. Frames transferable value for the target industry using only real CV skills."
}`,
          prompt: `You are an ATS + recruiter optimization coach — NOT a hiring critic.
Works for ANY profession (healthcare, finance, education, trades, marketing, ops, engineering, etc.) — never assume the candidate is a software engineer.

Target: ${roleLine}

CRITICAL RULES:
- ONLY use skills, tools, methods, and domains already present in the CV.
- Do NOT invent credentials, tools, or specialty skills that are not in the CV.
- Do NOT invent a new job title or persona. Reframe the existing career for the target seniority/industry using their real experience.
- Industry may guide phrasing/emphasis only — never add capabilities they have not demonstrated.
- NEVER say experience in the target industry is "limited", "lacking", "weak", or similar. Do not apologize for gaps.
- Instead, state the concrete VALUE my existing skills bring to ${roleDetails.industry || "the target industry"} (transferable impact, outcomes, ways of working).
- optimizedSummary MUST be FIRST PERSON (I / my / I've), as if the candidate wrote their own CV. Never use he/she/they or the candidate's full name.
- Do NOT use em dashes, en dashes, or spaced hyphens as punctuation. Use commas or periods instead.
- optimizedSummary MUST be complete: 3–4 full sentences, end with a period, never cut off mid-sentence or mid-clause.

Structured CV:
${JSON.stringify(cvForAnalysis, null, 2)}

Return:
1. score (0-100): current ATS match BEFORE optimization (honest; typical 45-75).
2. foundKeywords: role-relevant terms already present in the CV (use the candidate's own vocabulary).
3. missingKeywords: 5-8 phrasing/emphasis opportunities drawn from THEIR existing experience (synonyms or stronger wording of what they already did) — never brand-new skills they have not used.
4. summaryAssessment: 2 sentences, optimistic + actionable (what we will rephrase for visibility).
5. optimizedSummary: polished FIRST-PERSON Professional Summary (3-4 COMPLETE sentences) using ONLY CV skills/experience, reframed for ${roleDetails.title}${roleDetails.seniority ? ` (${roleDetails.seniority})` : ""}${roleDetails.industry ? ` in ${roleDetails.industry}` : ""}. Sell transferable value to that industry. Start with "I" (not the person's name). No invented skills. No "limited experience" language. Must end cleanly.
`,
        });

        const summary = humanizeGeneratedText(
          analysis.optimizedSummary || "",
          input.structuredCV.name
        );

        const structuredCV: StructuredCV = {
          ...input.structuredCV,
          summary: summary || input.structuredCV.summary || "",
        };

        return {
          structuredCV,
          analysis: {
            ...analysis,
            summaryAssessment: polishGrammar(
              sanitizeAiText(analysis.summaryAssessment || "")
            ),
            optimizedSummary: summary,
            foundKeywords: (analysis.foundKeywords || []).map((k) =>
              polishGrammar(sanitizeAiText(k))
            ),
            missingKeywords: (analysis.missingKeywords || []).map((k) =>
              polishGrammar(sanitizeAiText(k))
            ),
          },
        };
      }

      // Cold path: structure + analyze in a single call
      const combined = await generateStructured({
        schema: z.object({
          cv: cvSchema,
          analysis: analysisSchema,
        }),
        maxAttempts: 1,
        schemaHint: `{
  "cv": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "summary": "string",
    "experience": [{ "company": "string", "role": "string", "duration": "string", "description": ["bullet"] }],
    "skills": ["skill"],
    "education": [{ "institution": "string", "degree": "string", "year": "string" }]
  },
  "analysis": {
    "score": 58,
    "foundKeywords": ["stakeholder management"],
    "missingKeywords": ["process improvement"],
    "summaryAssessment": "Optimization-focused assessment",
    "optimizedSummary": "I am a role-targeted first-person summary"
  }
}`,
        prompt: `You are an ATS CV optimizer helping candidates get noticed by recruiters.
Works for ANY profession — never assume software engineering or tech stacks.

Target: ${roleLine}

CRITICAL: Never invent skills/tools/credentials not in the CV. Never invent a new role persona. Only rephrase existing experience for the target seniority/industry.
NEVER say the candidate has "limited" experience in the target industry — frame transferable value instead.
optimizedSummary must be FIRST PERSON (I / my), 3–4 COMPLETE sentences ending with a period (never truncated). Never use the person's name or he/she.
Do not use em dashes or en dashes; use commas or periods.

From the raw CV text:
1) Extract structured CV fields (do not invent employers/dates/achievements/skills). Keep ALL meaningful experience bullets — do not drop significant achievements.
2) Score current ATS match for the target role.
3) foundKeywords = terms already in the CV; missingKeywords = stronger phrasing opportunities from their real experience only (never new skills).
4) summaryAssessment: optimistic optimization tone (what we will rephrase — never "needs training").
5) optimizedSummary: 3-4 complete FIRST-PERSON sentences using ONLY skills/experience from the CV, reframed for the target industry with transferable value (no apology language).

Raw CV text:
${String(input.parsedText).substring(0, 12000)}
`,
      });

      const summary = humanizeGeneratedText(
        combined.analysis.optimizedSummary || "",
        combined.cv.name
      );

      const structuredCV: StructuredCV = {
        ...combined.cv,
        summary: summary || combined.cv.summary || "",
      };

      return {
        structuredCV,
        analysis: {
          ...combined.analysis,
          summaryAssessment: polishGrammar(
            sanitizeAiText(combined.analysis.summaryAssessment || "")
          ),
          optimizedSummary: summary,
          foundKeywords: (combined.analysis.foundKeywords || []).map((k) =>
            polishGrammar(sanitizeAiText(k))
          ),
          missingKeywords: (combined.analysis.missingKeywords || []).map((k) =>
            polishGrammar(sanitizeAiText(k))
          ),
        },
      };
    });
  } catch (error: unknown) {
    console.error("Optimization analysis error:", error);
    if (isRateLimitError(error)) throw error;
    throw new Error(
      isLlmErrorMissingKey(error)
        ? "REQUIRE_KEY"
        : "Failed to analyze CV. Please try again."
    );
  }
}

export async function rewriteCVSentencesAction(
  cvData: StructuredCV,
  roleDetails: RoleDetails | null,
  missingKeywords?: string[]
) {
  if (!cvData || !roleDetails?.title) {
    throw new Error("Missing CV data or target role");
  }

  try {
    const lockKey = `rewrites:${textFingerprint(JSON.stringify(cvData))}:${roleFingerprint(roleDetails)}`;
    return await withRequestLock(lockKey, async () => {
      const clientId = await getClientIp();
      assertLlmRateLimit(clientId, "rewrites");

      return generateStructured({
        schema: z.object({
          improvements: z
            .array(
              z.object({
                originalSentence: z.string(),
                rewrittenSentence: z.string(),
                reasoning: z.string(),
              })
            )
            .catch([]),
        }),
        schemaHint: `{
  "improvements": [
    {
      "originalSentence": "exact original bullet",
      "rewrittenSentence": "improved bullet with stronger verbs and role keywords",
      "reasoning": "how this improves ATS/recruiter visibility"
    }
  ]
}`,
        maxAttempts: 1,
        prompt: `
You are an expert resume writer for ANY profession (not only tech). Rephrase this CV for ATS + recruiters targeting: ${roleDetails.title}${roleDetails.seniority ? ` (${roleDetails.seniority})` : ""}${roleDetails.industry ? ` in ${roleDetails.industry}` : ""}.

Emphasis opportunities (ONLY if already supported by the CV — never invent skills): ${(missingKeywords || []).join(", ") || "terms already in the CV"}.

CV Data:
${JSON.stringify(cvData, null, 2)}

Rules:
1. Pick 3–5 weak/passive bullets from experience (rewrite in place — do not delete other bullets).
2. Rewrite for impact and seniority using ONLY skills already in that bullet or the CV skills list.
3. NEVER invent employers, job titles, tools, credentials, or metrics not in the original.
4. Industry may guide how you describe existing work — do not add new capabilities. Never say experience is "limited".
5. originalSentence must match the EXACT original bullet text.
6. reasoning = ATS/recruiter benefit of the rephrase, not "candidate lacks skill".
7. Do not use em dashes, en dashes, or spaced hyphens as punctuation in rewrittenSentence.
`,
      }).then((data) => ({
        improvements: (data.improvements || []).map((imp) => ({
          ...imp,
          rewrittenSentence: polishGrammar(sanitizeAiText(imp.rewrittenSentence || "")),
          reasoning: polishGrammar(sanitizeAiText(imp.reasoning || "")),
        })),
      }));
    });
  } catch (error: unknown) {
    console.error("Error generating rewrites:", error);
    if (isRateLimitError(error)) throw error;
    throw new Error(
      isLlmErrorMissingKey(error) ? "REQUIRE_KEY" : "Failed to generate rewrites."
    );
  }
}

/**
 * Fast LinkedIn suggestions from the improved CV (no LLM call).
 * Headline / About / skills / bullets are assembled from content already optimized.
 */
export async function generateLinkedInAction(
  cvData: StructuredCV,
  roleDetails: RoleDetails | null
) {
  if (!cvData || !roleDetails?.title) {
    throw new Error("Missing CV data or target role");
  }

  const skills = (cvData.skills || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 15);

  const skillBit = skills.slice(0, 3).join(" · ");
  const seniority = (roleDetails.seniority || "").trim();
  const industry = (roleDetails.industry || "").trim();
  const baseRole =
    cvData.experience?.[0]?.role?.trim() || roleDetails.title.trim() || "Professional";

  // LinkedIn-standard headline: Role | key skills | industry (pipes are normal on LinkedIn)
  const headlineParts = [
    seniority && !baseRole.toLowerCase().includes(seniority.toLowerCase())
      ? `${seniority} ${baseRole}`.replace(/\s+/g, " ").trim()
      : baseRole,
    skillBit || null,
    industry || null,
  ].filter(Boolean);
  const headline = headlineParts.join(" | ").slice(0, 220);

  const summary = humanizeGeneratedText(cvData.summary || "", cvData.name);
  const topBullets = (cvData.experience || [])
    .flatMap((e) => e.description || [])
    .map((b) => polishGrammar(sanitizeAiText(b)))
    .filter(Boolean)
    .slice(0, 3);

  const aboutParas = [
    summary ||
      polishGrammar(
        `I am a ${baseRole} focused on delivering high-quality work and measurable impact${industry ? ` in ${industry}` : ""}.`
      ),
    topBullets.length
      ? polishGrammar(
          `Highlights from my experience include ${topBullets
            .map((b) => {
              const cleaned = b.replace(/\.$/, "").trim();
              if (!cleaned) return "";
              return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
            })
            .filter(Boolean)
            .join("; ")}.`
        )
      : skills.length
        ? polishGrammar(`My core strengths include ${skills.slice(0, 6).join(", ")}.`)
        : "",
    polishGrammar(
      `I am open to ${[seniority, roleDetails.title].filter(Boolean).join(" ")} opportunities${industry ? ` in ${industry}` : ""} where I can add value from day one. Let's connect.`
    ),
  ]
    .map((p) => polishGrammar(p))
    .filter(Boolean);

  const experienceBullets = (cvData.experience || []).slice(0, 3).map((exp) => ({
    role: exp.role,
    company: exp.company,
    bullets: (exp.description || [])
      .map((b) => polishGrammar(sanitizeAiText(b)))
      .filter(Boolean)
      .slice(0, 4),
  }));

  return {
    headline: polishGrammar(headline),
    about: aboutParas.join("\n\n"),
    skills,
    experienceBullets,
    connectionMessage: polishGrammar(
      `Hi [Name], I am a ${baseRole}${industry ? ` focused on ${industry}` : ""} and would love to connect. Looking forward to staying in touch!`
    ),
    profileStrengthTips: [
      "Add a clear professional photo",
      "Turn on Open to Work for recruiters",
      "Pin your strongest experience bullets",
      "Ask colleagues for skill endorsements that match your CV",
    ],
  };
}
