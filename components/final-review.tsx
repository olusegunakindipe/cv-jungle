"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCVContext } from "@/lib/cv-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildOptimizedCV } from "@/lib/optimize-cv";
import { computeScoreComparison } from "@/lib/ats-score";
import { generateCvPdf } from "@/lib/generate-cv-pdf";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  Loader2,
  RefreshCcw,
  Zap,
  CheckCircle2,
  FileText,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

function ScoreRing({
  score,
  size = 144,
  stroke = 10,
  colorClass,
  trackClass,
}: {
  score: number;
  size?: number;
  stroke?: number;
  colorClass: string;
  trackClass: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * Math.min(100, Math.max(0, score))) / 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-black tabular-nums">
          {score}
          <span className="text-base font-bold opacity-50">%</span>
        </span>
      </div>
    </div>
  );
}

export function FinalReview() {
  const {
    structuredCV,
    setStructuredCV,
    roleDetails,
    currentStep,
    setCurrentStep,
    keywordAnalysis,
    aiRewrites,
    linkedInSuggestions,
    isStructuring,
    setIsStructuring,
    structuringFailed,
    setStructuringFailed,
    isHydrated,
    parsedText,
  } = useCVContext();

  const structuringAttemptedRef = useRef(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    if (!parsedText || !roleDetails) {
      if (currentStep !== 1) {
        toast.error("Please upload your CV and select a role first.", {
          id: "missing-data",
        });
        setCurrentStep(1);
      }
      return;
    }

    // Only structure here if earlier steps never produced a structured CV.
    // Deduped on the API via withRequestLock — do not call if already failed.
    if (
      structuredCV ||
      !parsedText ||
      isStructuring ||
      structuringFailed ||
      structuringAttemptedRef.current
    ) {
      return;
    }

    structuringAttemptedRef.current = true;
    setIsStructuring(true);
    void (async () => {
      try {
        const res = await fetch("/api/structure-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: parsedText }),
        });

        if (res.ok) {
          const data = await res.json();
          setStructuredCV(data);
        } else {
          setStructuringFailed(true);
        }
      } catch {
        setStructuringFailed(true);
      } finally {
        setIsStructuring(false);
      }
    })();
  }, [
    structuredCV,
    parsedText,
    roleDetails,
    setStructuredCV,
    currentStep,
    setCurrentStep,
    isStructuring,
    structuringFailed,
    setIsStructuring,
    setStructuringFailed,
    isHydrated,
  ]);

  const optimizedCV = useMemo(() => {
    if (!structuredCV) return null;
    return buildOptimizedCV(
      structuredCV,
      keywordAnalysis,
      aiRewrites,
      linkedInSuggestions,
      roleDetails?.title
    );
  }, [
    structuredCV,
    keywordAnalysis,
    aiRewrites,
    linkedInSuggestions,
    roleDetails?.title,
  ]);

  const scores = useMemo(
    () => computeScoreComparison(keywordAnalysis, optimizedCV, aiRewrites),
    [keywordAnalysis, optimizedCV, aiRewrites]
  );

  const handleDownloadPDF = async () => {
    if (!optimizedCV) {
      if (structuringFailed) {
        toast.error("AI structuring failed. Please retry or check your API key.", {
          id: "struct-fail",
        });
      } else {
        toast.error("CV data is still being prepared. One moment...", {
          id: "struct-wait",
        });
      }
      return;
    }

    setDownloading(true);
    toast.loading("Generating your ATS-optimized CV...", { id: "pdf-toast" });

    try {
      await generateCvPdf(optimizedCV);
      toast.success("Optimized CV downloaded!", { id: "pdf-toast" });
    } catch (error: unknown) {
      console.error("PDF generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`PDF failed: ${errorMessage}`, {
        id: "pdf-toast",
        duration: 5000,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/20 dark:border-primary/25">
          <Zap className="w-3 h-3" />
          Step 06: Updated CV
        </div>
        <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
          Mission{" "}
          <span className="text-primary dark:text-primary not-italic">Complete</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto font-medium">
          Your CV is structured for ATS parsers and tuned for{" "}
          <span className="text-foreground font-bold">{roleDetails?.title}</span>.
        </p>
      </div>

      {/* Before / After score comparison */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
        <Card className="border-none shadow-xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2rem] flex flex-col items-center justify-center p-8 text-center space-y-4 relative opacity-80">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">
            Original CV
          </h3>
          <ScoreRing
            score={scores.originalScore}
            size={140}
            stroke={10}
            colorClass="text-amber-500"
            trackClass="text-muted"
          />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Before optimization
          </p>
        </Card>

        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-5 h-5" />
              <span className="text-2xl font-black tabular-nums">
                +{scores.improvementPoints}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70 dark:text-emerald-400/70 mt-1">
              +{scores.improvementPercent}% lift
            </p>
          </div>
          <Sparkles className="w-4 h-4 text-primary opacity-60" />
        </div>

        <Card className="border-none shadow-[0_32px_96px_-16px_oklch(0.42_0.1_155/0.2)] bg-card/95 backdrop-blur-md ring-2 ring-primary/40 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center space-y-4 relative">
          <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary left-0 rounded-t-[2rem]" />
          <div className="flex items-center gap-2 text-primary dark:text-primary">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">
              Improved CV
            </h3>
          </div>
          <ScoreRing
            score={scores.improvedScore}
            size={160}
            stroke={12}
            colorClass="text-primary"
            trackClass="text-primary-foreground/50 dark:text-primary/20"
          />
          <p className="text-sm font-black text-primary dark:text-primary uppercase tracking-[0.15em]">
            {scores.label}
          </p>
        </Card>
      </div>

      {/* Improvement breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Keywords recovered",
            value:
              scores.keywordsTotal > 0
                ? `${scores.keywordsRecovered}/${scores.keywordsTotal}`
                : "—",
          },
          {
            label: "Bullets rewritten",
            value: String(scores.rewritesApplied),
          },
          {
            label: "ATS format",
            value: "Single-column",
          },
          {
            label: "Skills enriched",
            value: String(optimizedCV?.skills?.length ?? 0),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-muted/30 px-4 py-4 text-center"
          >
            <p className="text-lg font-black tabular-nums text-foreground">
              {item.value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Live CV preview — matches download layout */}
      {optimizedCV && (
        <Card className="border-none shadow-xl ring-1 ring-border rounded-[2rem] overflow-hidden bg-white text-black">
          <div className="bg-muted/40 border-b border-border px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Preview — ATS-ready layout
              </span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              A4 · Text-based PDF
            </span>
          </div>

          <div className="p-8 md:p-12 max-w-[720px] mx-auto font-sans leading-relaxed">
            <div className="text-center border-b-2 border-black pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight uppercase text-black">
                {optimizedCV.name}
              </h1>
              <p className="text-xs text-neutral-600 mt-2">
                {[optimizedCV.location, optimizedCV.phone, optimizedCV.email]
                  .filter(Boolean)
                  .join("  •  ")}
              </p>
              {roleDetails?.title && (
                <p className="text-xs text-neutral-700 mt-1">{roleDetails.title}</p>
              )}
            </div>

            {optimizedCV.summary && (
              <section className="mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-black pb-1 mb-2 text-black">
                  Professional Summary
                </h2>
                <p className="text-[12px] text-neutral-800 leading-relaxed text-justify">
                  {optimizedCV.summary}
                </p>
              </section>
            )}

            {optimizedCV.skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-black pb-1 mb-2 text-black">
                  Core Skills
                </h2>
                <p className="text-[12px] text-neutral-800 leading-relaxed">
                  {optimizedCV.skills.join("  •  ")}
                </p>
              </section>
            )}

            {optimizedCV.experience.length > 0 && (
              <section className="mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-black pb-1 mb-3 text-black">
                  Professional Experience
                </h2>
                <div className="space-y-5">
                  {optimizedCV.experience.map((exp, i) => (
                    <div key={`${exp.company}-${i}`}>
                      <div className="flex justify-between gap-4 items-baseline">
                        <p className="text-[13px] font-bold text-black">
                          {exp.role}
                          {exp.company ? `  —  ${exp.company}` : ""}
                        </p>
                        <p className="text-[11px] text-neutral-600 whitespace-nowrap">
                          {exp.duration}
                        </p>
                      </div>
                      <ul className="mt-2 space-y-1.5 list-disc pl-4">
                        {(exp.description || []).map((bullet, bi) => (
                          <li
                            key={bi}
                            className="text-[12px] text-neutral-800 leading-relaxed"
                          >
                            {bullet.replace(/^[\s\-•▸●○▪►]+/, "").trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {optimizedCV.education.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-black pb-1 mb-3 text-black">
                  Education
                </h2>
                <div className="space-y-3">
                  {optimizedCV.education.map((edu, i) => (
                    <div key={`${edu.institution}-${i}`}>
                      <div className="flex justify-between gap-4 items-baseline">
                        <p className="text-[12px] font-bold text-black">{edu.degree}</p>
                        <p className="text-[11px] text-neutral-600">{edu.year}</p>
                      </div>
                      <p className="text-[12px] text-neutral-700">{edu.institution}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </Card>
      )}

      {/* Download CTA */}
      <div className="p-10 bg-ink dark:bg-primary/10 rounded-[2.5rem] border border-primary/20 dark:border-primary/25 overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 text-white pointer-events-none translate-x-1/4 -translate-y-1/4">
          <FileText className="w-64 h-64" />
        </div>

        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white uppercase italic">
              Download your optimized CV
            </h3>
            <p className="text-white/75 font-medium max-w-lg mx-auto leading-relaxed">
              Text-based A4 PDF with AI rewrites, enriched skills, and a clean
              single-column layout that ATS systems can parse reliably.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-6 justify-center">
            {!structuredCV && structuringFailed ? (
              <Button
                onClick={() => {
                  setStructuringFailed(false);
                  structuringAttemptedRef.current = false;
                }}
                variant="outline"
                className="h-16 px-10 rounded-2xl border-white/20 text-white hover:bg-white/10 font-black uppercase tracking-widest transition-all"
              >
                <RefreshCcw className="mr-2 h-5 w-5" />
                Retry Structuring
              </Button>
            ) : (
              <Button
                onClick={handleDownloadPDF}
                disabled={isStructuring || downloading || !optimizedCV}
                className="h-20 px-12 rounded-[2rem] bg-primary hover:bg-primary/90 text-white shadow-[0_20px_40px_-12px_oklch(0.42_0.1_155/0.35)] transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-4 text-xl font-black uppercase tracking-[0.1em] group disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isStructuring || downloading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    {downloading ? "Generating..." : "Preparing..."}
                  </>
                ) : (
                  <>
                    <Download className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
                    Download CV
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
            {[
              "A4 Format",
              "ATS-Friendly Text",
              `${scores.improvedScore}% Match Score`,
            ].map((label) => (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-border">
        <button
          onClick={() => setCurrentStep(5)}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Review LinkedIn
        </button>

        <div className="flex items-center gap-1.5 opacity-50">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-8 h-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.42_0.1_155/0.35)]" />
        </div>
      </div>
    </div>
  );
}
