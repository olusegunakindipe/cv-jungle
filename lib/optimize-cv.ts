import {
  StructuredCV,
  AnalysisResult,
  RewriteResult,
  LinkedInResult,
  Experience,
} from "@/types/cv";
import { sanitizeAiText, humanizeGeneratedText, polishGrammar } from "@/lib/text-style";

export interface OptimizedCV extends StructuredCV {
  targetRole?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[\s\-•▸●○▪►]+/, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bulletsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(" ").filter((w) => w.length > 3));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return false;
  let overlap = 0;
  wa.forEach((w) => {
    if (wb.has(w)) overlap += 1;
  });
  return overlap / Math.min(wa.size, wb.size) >= 0.6;
}

function applyRewrites(
  experience: Experience[],
  rewrites: RewriteResult | null
): Experience[] {
  if (!rewrites?.improvements?.length) return experience;
  const used = new Set<number>();
  return experience.map((exp) => ({
    ...exp,
    description: (exp.description || []).map((bullet) => {
      const idx = rewrites.improvements.findIndex(
        (imp, i) => !used.has(i) && bulletsMatch(imp.originalSentence, bullet)
      );
      if (idx >= 0) {
        used.add(idx);
        return rewrites.improvements[idx].rewrittenSentence;
      }
      return bullet;
    }),
  }));
}

/** Keep only skills already on the CV — never invent or import new ones. */
function keepOriginalSkills(existing: string[], maxSkills = 24): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of existing) {
    const key = skill.trim().toLowerCase();
    if (!key || seen.has(key) || result.length >= maxSkills) continue;
    seen.add(key);
    result.push(skill.trim());
  }
  return result;
}

/** Prefer complete sentences — never cut mid-clause. */
export function trimAtSentence(text: string, maxChars: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const ends = [". ", "! ", "? "].map((p) => slice.lastIndexOf(p));
  const last = Math.max(...ends);
  if (last > maxChars * 0.45) {
    return slice.slice(0, last + 1).trim();
  }
  const lastPeriod = slice.lastIndexOf(".");
  if (lastPeriod > maxChars * 0.45) {
    return slice.slice(0, lastPeriod + 1).trim();
  }
  return slice.trim();
}

function buildSummary(
  cv: StructuredCV,
  analysis: AnalysisResult | null,
  linkedIn: LinkedInResult | null,
  roleTitle?: string
): string {
  const name = cv.name?.trim();

  const fromAnalysis = analysis?.optimizedSummary?.trim();
  if (fromAnalysis) {
    return trimAtSentence(humanizeGeneratedText(fromAnalysis, name), 900);
  }

  const base = (cv.summary || "").trim();
  if (base) return trimAtSentence(humanizeGeneratedText(base, name), 900);

  if (linkedIn?.about) {
    const firstPara = linkedIn.about
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)[0];
    if (firstPara) {
      return trimAtSentence(humanizeGeneratedText(firstPara, name), 900);
    }
  }

  if (roleTitle) {
    return `I am an accomplished professional targeting ${roleTitle} roles, with a proven record of delivering measurable results.`;
  }
  return "";
}

/**
 * Preserve significant content for a strong ATS CV.
 * Soft-cap only empty/noise bullets — keep real achievements.
 */
function prepareExperience(
  experience: Experience[],
  maxRoles = 5,
  maxBulletsPerRole = 8
): Experience[] {
  return experience.slice(0, maxRoles).map((exp) => ({
    ...exp,
    description: (exp.description || [])
      .map((b) => polishGrammar(sanitizeAiText(b.replace(/^[\s\-•▸●○▪►]+/, "").trim())))
      .filter((b) => b.length > 12)
      .slice(0, maxBulletsPerRole),
  }));
}

/** Merge structured CV + AI outputs into a download-ready CV. */
export function buildOptimizedCV(
  cv: StructuredCV,
  analysis: AnalysisResult | null,
  rewrites: RewriteResult | null,
  linkedIn: LinkedInResult | null,
  roleTitle?: string
): OptimizedCV {
  const rewritten = applyRewrites(cv.experience || [], rewrites);

  return {
    ...cv,
    name: cv.name?.trim() || "Professional",
    email: cv.email?.trim() || "",
    phone: cv.phone?.trim() || "",
    location: cv.location?.trim() || "",
    summary: buildSummary(cv, analysis, linkedIn, roleTitle),
    experience: prepareExperience(rewritten, 5, 8),
    skills: keepOriginalSkills(cv.skills || [], 24),
    education: (cv.education || []).slice(0, 3),
    targetRole: roleTitle,
  };
}
