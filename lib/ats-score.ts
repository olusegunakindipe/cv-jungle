import { AnalysisResult, RewriteResult, StructuredCV } from "@/types/cv";
import { OptimizedCV } from "@/lib/optimize-cv";

export interface ScoreComparison {
  originalScore: number;
  improvedScore: number;
  improvementPoints: number;
  improvementPercent: number;
  keywordsRecovered: number;
  keywordsTotal: number;
  rewritesApplied: number;
  label: string;
}

function textIncludesKeyword(haystack: string, keyword: string): boolean {
  const h = haystack.toLowerCase();
  const k = keyword.toLowerCase().trim();
  if (!k) return false;
  if (h.includes(k)) return true;
  // Loose match on significant tokens
  const tokens = k.split(/[\s/|,]+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return false;
  return tokens.every((t) => h.includes(t));
}

function cvContainsKeyword(cv: OptimizedCV | StructuredCV, keyword: string): boolean {
  const blob = [
    cv.summary,
    ...(cv.skills || []),
    ...(cv.experience || []).flatMap((e) => [
      e.role,
      e.company,
      ...(e.description || []),
    ]),
  ].join(" ");
  return textIncludesKeyword(blob, keyword);
}

/**
 * Deterministic before/after ATS score so users see a clear improvement.
 * Base = analysis score from step 3. Gains come from recovered keywords + rewrites + structure.
 */
export function computeScoreComparison(
  analysis: AnalysisResult | null,
  optimizedCV: OptimizedCV | null,
  rewrites: RewriteResult | null
): ScoreComparison {
  const originalScore = Math.max(0, Math.min(100, Math.round(analysis?.score ?? 55)));

  const missing = analysis?.missingKeywords || [];
  const keywordsRecovered = optimizedCV
    ? missing.filter((kw) => cvContainsKeyword(optimizedCV, kw)).length
    : 0;
  const keywordsTotal = missing.length;

  const rewritesApplied = rewrites?.improvements?.length ?? 0;

  // Gains are capped so the result feels credible, not inflated to 100.
  const keywordGain =
    keywordsTotal > 0 ? Math.round((keywordsRecovered / keywordsTotal) * 20) : 6;
  const rewriteGain = Math.min(rewritesApplied * 2.5, 10);
  const structureGain = 5; // clean ATS-friendly single-column layout
  const skillsGain = Math.min(
    Math.max(0, (optimizedCV?.skills?.length || 0) - 6) * 0.4,
    4
  );

  const rawImproved =
    originalScore + keywordGain + rewriteGain + structureGain + skillsGain;
  // Always show a meaningful lift when optimization ran, but never exceed 98.
  const floorImproved = Math.min(98, originalScore + 8);
  const improvedScore = Math.max(floorImproved, Math.min(98, Math.round(rawImproved)));

  const improvementPoints = improvedScore - originalScore;
  const improvementPercent =
    originalScore > 0
      ? Math.round((improvementPoints / originalScore) * 100)
      : improvedScore;

  let label = "Strong Match";
  if (improvedScore >= 90) label = "Top Match";
  else if (improvedScore >= 80) label = "Excellent Match";
  else if (improvedScore >= 70) label = "Good Match";
  else if (improvedScore >= 60) label = "Fair Match";
  else label = "Needs Work";

  return {
    originalScore,
    improvedScore,
    improvementPoints,
    improvementPercent,
    keywordsRecovered,
    keywordsTotal,
    rewritesApplied,
    label,
  };
}
