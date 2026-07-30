"use client";

import { useState, useEffect, useRef } from "react";
import { useCVContext } from "@/lib/cv-context";
import { RewriteResult, RewriteSuggestion } from "@/types/cv";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  AlertCircle,
  Quote,
  Zap,
  Target,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { rewriteCVSentencesAction } from "@/app/actions";
import { textFingerprint, withRequestLock, roleFingerprint } from "@/lib/request-lock";
import toast from "react-hot-toast";

export function AIRewrites() {
  const {
    roleDetails,
    currentStep,
    setCurrentStep,
    aiRewrites,
    setAiRewrites,
    structuredCV,
    parsedText,
    isHydrated,
    keywordAnalysis,
  } = useCVContext();
  const [result, setResult] = useState<RewriteResult | null>(aiRewrites);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setResult(aiRewrites);
  }, [aiRewrites]);

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
  }, [isHydrated, parsedText, roleDetails, currentStep, setCurrentStep]);

  const fetchRewrites = async (force = false) => {
    if (!force && (result || inFlightRef.current || aiRewrites)) return;
    if (!structuredCV || !roleDetails) return;

    const lockKey = `rewrites:${textFingerprint(JSON.stringify(structuredCV))}:${roleFingerprint(roleDetails)}`;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await withRequestLock(lockKey, () =>
        rewriteCVSentencesAction(
          structuredCV,
          roleDetails,
          keywordAnalysis?.missingKeywords
        )
      );
      setResult(data as RewriteResult);
      setAiRewrites(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate rewrites.";
      if (errorMessage.includes("usage limit") || errorMessage.includes("RATE_LIMIT")) {
        setError(errorMessage);
      } else if (errorMessage.includes("REQUIRE_KEY")) {
        setError(
          "LLM API key missing. Add GROQ_API_KEY (free) or OPENAI_API_KEY in .env.local — see .env.example."
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
    if (structuredCV && roleDetails && !result && !error && !aiRewrites) {
      void fetchRewrites(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuredCV, roleDetails]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 border border-primary/20 dark:border-primary/25">
          <Zap className="w-3 h-3" />
          Step 04: Content Expansion
        </div>
        <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
          High-Impact
          <span className="text-primary dark:text-primary not-italic">Rewrites</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto font-medium">
          We&apos;ve transformed your existing bullet points into high-velocity
          achievement statements tailored for{" "}
          <span className="text-foreground font-bold">{roleDetails?.title}</span>.
        </p>
      </div>

      {loading && (
        <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[3rem] p-12 text-center space-y-10 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-32 h-32 scale-125 mx-auto">
            <div className="w-full h-full border-8 border-primary/15 dark:border-primary/15 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-4 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic">
              Optimizing Syntax...
            </h3>
            <p className="text-muted-foreground font-medium italic">
              Scanning for passive verbs and infusing industry-leading achievement metrics
              into your performance records.
            </p>
            <Progress value={85} className="h-2 rounded-full bg-muted" />
            <div className="flex gap-2 justify-center pt-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-0"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300"></div>
            </div>
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
              Expansion Failed
            </h3>
            <p className="text-red-600 dark:text-red-300 font-medium max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={() => void fetchRewrites(true)}
              className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline flex items-center justify-center gap-2 mx-auto pt-4"
            >
              <RefreshCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-10">
          <div className="space-y-8">
            {result.improvements.map((item: RewriteSuggestion, index: number) => (
              <Card
                key={index}
                className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500"
              >
                <div className="flex flex-col md:flex-row h-full min-h-[220px]">
                  {/* Original Sentence */}
                  <div className="w-full md:w-5/12 p-8 md:p-10 bg-muted/30 border-r border-border relative transition-colors group-hover:bg-muted/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-border group-hover:bg-primary/30 transition-colors"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                      <Quote className="w-3 h-3" />
                      Original phrasing
                    </h4>
                    <p className="text-muted-foreground font-medium leading-relaxed italic pr-4">
                      &quot;{item.originalSentence}&quot;
                    </p>
                  </div>

                  {/* Rewrite & Reasoning */}
                  <div className="w-full md:w-7/12 p-8 md:p-10 bg-card relative">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] dark:opacity-[0.08] text-primary pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                      <Target className="w-48 h-48" />
                    </div>

                    <div className="space-y-6 relative z-10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Strategic Optimization
                      </h4>
                      <p className="text-foreground font-bold text-xl leading-relaxed tracking-tight group-hover:text-primary dark:group-hover:text-primary transition-colors">
                        {item.rewrittenSentence}
                      </p>

                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/15 text-primary flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-muted-foreground font-bold leading-relaxed">
                          <span className="text-muted-foreground uppercase tracking-widest mr-2 opacity-60">
                            Logic:
                          </span>
                          {item.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* LinkedIn (optional, blue) then Proceed to Updated CV (not blue) */}
          <div className="flex flex-col-reverse sm:flex-row gap-6 justify-between pt-12">
            <button
              onClick={() => setCurrentStep(3)}
              className="cursor-pointer w-full sm:w-auto text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Analysis
            </button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setCurrentStep(5)}
                className="w-full sm:w-auto h-16 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 text-sm font-black uppercase tracking-widest cursor-pointer"
              >
                LinkedIn Improvement
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(6)}
                className="w-full sm:w-auto h-16 px-8 rounded-2xl border-border bg-background text-foreground hover:bg-muted/50 transition-all flex items-center gap-3 text-sm font-black uppercase tracking-widest cursor-pointer"
              >
                Proceed to Updated CV
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Indicator of Progress */}
      <div className="flex justify-center items-center gap-1.5 py-4 opacity-50">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
        <div className="w-8 h-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.42_0.1_155/0.35)]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-muted"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-muted"></div>
      </div>
    </div>
  );
}
