"use client";

import { useState, useEffect, useRef } from "react";
import { useCVContext } from "@/lib/cv-context";
import { AnalysisResult } from "@/types/cv";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  Sparkles,
  Zap,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { runOptimizationAnalysisAction } from "@/app/actions";
import { textFingerprint, withRequestLock, roleFingerprint } from "@/lib/request-lock";
import toast from "react-hot-toast";

export function KeywordAnalysis() {
  const {
    parsedText,
    roleDetails,
    currentStep,
    setCurrentStep,
    keywordAnalysis,
    setKeywordAnalysis,
    structuredCV,
    setStructuredCV,
    isHydrated,
  } = useCVContext();
  const [result, setResult] = useState<AnalysisResult | null>(keywordAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  // Keep local UI in sync with context when navigating back / retargeting
  useEffect(() => {
    setResult(keywordAnalysis);
  }, [keywordAnalysis]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!parsedText || !roleDetails) {
      if (currentStep !== 1) {
        toast.error("Please upload your CV and select a role first.", {
          id: "missing-data",
        });
        setCurrentStep(1);
      }
    }
  }, [isHydrated, parsedText, roleDetails, currentStep, setCurrentStep]);

  const runAnalysisPipeline = async (force = false) => {
    // Never re-call the API if we already have analysis (unless user forces retry)
    if (!force && (result || inFlightRef.current || keywordAnalysis)) return;
    if (!parsedText || !roleDetails) return;

    // One lock for the whole step — prevents Strict Mode / double-click duplicates
    const lockKey = `step3:${textFingerprint(parsedText)}:${roleFingerprint(roleDetails)}`;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await withRequestLock(lockKey, () =>
        runOptimizationAnalysisAction({
          parsedText,
          // Reuse structured CV on retry so we don't re-extract if we already have it
          structuredCV: force ? structuredCV : structuredCV,
          roleDetails,
        })
      );

      setStructuredCV(data.structuredCV);
      setResult(data.analysis);
      setKeywordAnalysis(data.analysis);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze keywords.";
      if (errorMessage.includes("usage limit") || errorMessage.includes("RATE_LIMIT")) {
        setError(errorMessage);
      } else if (
        errorMessage.includes("REQUIRE_KEY") ||
        errorMessage.includes("401") ||
        errorMessage.includes("API key") ||
        errorMessage.includes("quota")
      ) {
        setError(
          "AI service unavailable. Check GROQ_API_KEY in .env.local — see .env.example."
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      isHydrated &&
      parsedText &&
      roleDetails &&
      !result &&
      !error &&
      !keywordAnalysis
    ) {
      void runAnalysisPipeline(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, parsedText, roleDetails]);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const scoreBgColor = (score: number) => {
    if (score >= 80) return "bg-primary";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 border border-primary/20 dark:border-primary/25">
          <Zap className="w-3 h-3" />
          Step 03: ATS Optimization Plan
        </div>
        <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
          Make You{" "}
          <span className="text-primary dark:text-primary not-italic">Discoverable</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto font-medium">
          We score your current CV against{" "}
          <span className="text-foreground font-bold underline decoration-primary/30">
            {roleDetails?.title}
          </span>
          , then plan the keyword upgrades recruiters and ATS look for.
        </p>
      </div>

      {loading && (
        <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[3rem] p-12 text-center space-y-10 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-32 h-32 scale-125 mx-auto">
            <div className="w-full h-full border-8 border-primary/15 dark:border-primary/15 rounded-full" />
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-4 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic">
              Optimizing your ATS profile…
            </h3>
            <p className="text-muted-foreground font-medium italic">
              One smart pass: structure your CV, score keyword match, and draft a
              role-targeted summary.
            </p>
            <Progress value={70} className="h-2 rounded-full bg-muted" />
          </div>
        </Card>
      )}

      {error && !loading && (
        <Card className="border-red-100 dark:border-red-900/50 shadow-2xl bg-red-50/30 dark:bg-red-950/20 rounded-[3rem] overflow-hidden">
          <div className="p-12 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-red-800 dark:text-red-400 uppercase italic">
              Analysis Halted
            </h3>
            <p className="text-red-600 dark:text-red-300 font-medium max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={() => void runAnalysisPipeline(true)}
              className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline flex items-center justify-center gap-2 mx-auto pt-4"
            >
              <RefreshCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
              <div
                className={`absolute top-0 w-full h-2 ${scoreBgColor(result.score)} left-0`}
              />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                Current ATS Match
              </h3>
              <div className="relative scale-110">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="14"
                    fill="transparent"
                    className="text-muted"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={439.8}
                    strokeDashoffset={439.8 - (439.8 * result.score) / 100}
                    strokeLinecap="round"
                    className={scoreColor(result.score)}
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-foreground flex items-baseline gap-0.5">
                  {result.score}
                  <span className="text-lg opacity-40">%</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Before we optimize — next steps raise this
              </p>
            </Card>

            <Card className="lg:col-span-2 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[3rem] p-10 md:p-12 relative overflow-hidden">
              <div className="space-y-6 relative z-10 h-full flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Optimization plan
                  </h3>
                </div>
                <p className="text-xl leading-relaxed text-foreground font-bold italic underline decoration-primary/20 decoration-4">
                  &quot;{result.summaryAssessment}&quot;
                </p>
                {result.optimizedSummary && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Draft professional summary (for your CV)
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {result.optimizedSummary}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl bg-primary/10 dark:bg-primary/10 ring-1 ring-primary/15 rounded-[2.5rem] p-10 space-y-8">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-primary dark:text-primary italic">
                    Already working
                  </h4>
                  <p className="text-xs text-primary/70 uppercase font-black tracking-widest">
                    Keywords recruiters will find
                  </p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-wrap gap-3">
                {result.foundKeywords.length > 0 ? (
                  result.foundKeywords.map((kw) => (
                    <div
                      key={kw}
                      className="bg-card text-primary dark:text-primary px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-primary/20 dark:border-primary/30"
                    >
                      {kw}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic font-medium">
                    We&apos;ll surface stronger keywords in the next steps.
                  </p>
                )}
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-ink text-white rounded-[2.5rem] p-10 space-y-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-white italic">
                    Phrasing to strengthen
                  </h4>
                  <p className="text-xs text-white/70 uppercase font-black tracking-widest">
                    Emphasize from your existing experience — no new skills added
                  </p>
                </div>
                <Sparkles className="w-6 h-6 shrink-0 text-leaf" />
              </div>
              <div className="flex flex-wrap gap-3">
                {result.missingKeywords.length > 0 ? (
                  result.missingKeywords.map((kw) => (
                    <div
                      key={kw}
                      className="bg-white/12 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-white/30"
                    >
                      + {kw}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/80 italic font-medium">
                    Strong keyword coverage — we&apos;ll polish phrasing next.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-6 justify-between pt-12">
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full sm:w-auto text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Change Role
            </button>
            <Button
              onClick={() => setCurrentStep(4)}
              className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 text-lg font-black uppercase tracking-widest cursor-pointer"
            >
              Optimize Bullets
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
