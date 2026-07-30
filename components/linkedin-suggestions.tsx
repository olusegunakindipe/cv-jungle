"use client";

import { useState, useEffect, useRef } from "react";
import { useCVContext } from "@/lib/cv-context";
import { LinkedInResult } from "@/types/cv";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  Sparkles,
  Zap,
  Cpu,
  Copy,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Users,
  Briefcase,
} from "lucide-react";
import { generateLinkedInAction } from "@/app/actions";
import { publicActionError } from "@/lib/action-errors";
import { textFingerprint, withRequestLock, roleFingerprint } from "@/lib/request-lock";
import { buildOptimizedCV } from "@/lib/optimize-cv";
import toast from "react-hot-toast";

export function LinkedInSuggestions() {
  const {
    roleDetails,
    currentStep,
    setCurrentStep,
    linkedInSuggestions,
    setLinkedInSuggestions,
    structuredCV,
    parsedText,
    isHydrated,
    keywordAnalysis,
    aiRewrites,
  } = useCVContext();
  const [result, setResult] = useState<LinkedInResult | null>(linkedInSuggestions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const inFlightRef = useRef(false);

  useEffect(() => {
    setResult(linkedInSuggestions);
  }, [linkedInSuggestions]);

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

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
      toast.success("Copied to clipboard!", { id: "copy" });
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const fetchLinkedInSuggestions = async (force = false) => {
    if (!force && (result || inFlightRef.current || linkedInSuggestions)) return;
    if (!structuredCV || !roleDetails) {
      if (force)
        toast.error("Your CV is still processing. Please try again in a moment.");
      return;
    }

    // Use the same improved CV content as the final download
    const improvedCV = buildOptimizedCV(
      structuredCV,
      keywordAnalysis,
      aiRewrites,
      null,
      roleDetails.title
    );

    const lockKey = `linkedin:${textFingerprint(JSON.stringify(improvedCV))}:${roleFingerprint(roleDetails)}`;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await withRequestLock(lockKey, () =>
        generateLinkedInAction(improvedCV, roleDetails)
      );
      setResult(data as LinkedInResult);
      setLinkedInSuggestions(data as LinkedInResult);
    } catch (err: unknown) {
      setError(publicActionError(err));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      isHydrated &&
      structuredCV &&
      roleDetails &&
      !result &&
      !error &&
      !linkedInSuggestions
    ) {
      void fetchLinkedInSuggestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, structuredCV, roleDetails]);

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all active:scale-90 shrink-0"
    >
      {copied[id] ? (
        <CheckCircle2 className="w-5 h-5 text-primary" />
      ) : (
        <Copy className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="text-center mb-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/20 dark:border-primary/25">
          <Zap className="w-3 h-3" />
          Step 05: LinkedIn Improvement
        </div>
        <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
          LinkedIn{" "}
          <span className="text-primary dark:text-primary not-italic">Improvement</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto font-medium text-base">
          Optional step — copy headline, About, skills, and experience from your improved
          CV into LinkedIn.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="border-none shadow-2xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[3rem] p-12 flex flex-col items-center justify-center min-h-[400px] gap-8">
          <div className="relative w-32 h-32 scale-125 mx-auto">
            <div className="w-full h-full border-8 border-primary/15 dark:border-primary/15 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-3 max-w-md text-center">
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic">
              Crafting Your Profile...
            </h3>
            <p className="text-muted-foreground font-medium">
              Generating keyword-optimized content for every major LinkedIn section.
            </p>
            <Progress value={88} className="h-2 rounded-full bg-muted" />
          </div>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20 rounded-[3rem] p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-red-800 dark:text-red-400 uppercase italic">
            Generation Failed
          </h3>
          <p className="text-red-700 dark:text-red-300 font-medium max-w-md mx-auto text-sm">
            {error}
          </p>
          <button
            onClick={() => void fetchLinkedInSuggestions(true)}
            className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline flex items-center gap-2 mx-auto pt-2"
          >
            <RefreshCcw className="w-4 h-4" /> Try Again
          </button>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* 1. Headline */}
          <Card className="border-none shadow-xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Section 1 of 6
                </p>
                <h3 className="text-lg font-black text-foreground uppercase italic flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" /> Strategic Headline
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Copy this as your LinkedIn headline (220 chars max)
                </p>
              </div>
              <CopyButton text={result.headline} id="headline" />
            </CardHeader>
            <CardContent className="p-8 pt-5">
              <div className="bg-muted/40 p-6 rounded-2xl border border-border">
                <p className="text-xl font-bold text-foreground leading-snug">
                  {result.headline}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. About */}
          <Card className="border-none shadow-xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Section 2 of 6
                </p>
                <h3 className="text-lg font-black text-foreground uppercase italic flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> About Section
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Paste into your LinkedIn &quot;About&quot; section
                </p>
              </div>
              <CopyButton text={result.about} id="about" />
            </CardHeader>
            <CardContent className="p-8 pt-5">
              <div className="bg-muted/40 p-6 rounded-2xl border border-border">
                {(result.about || "").trim() ? (
                  result.about
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((para, i) => (
                      <p
                        key={i}
                        className="text-base text-foreground leading-relaxed font-medium mb-4 last:mb-0"
                      >
                        {para}
                      </p>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    About content unavailable — try generating again.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Skills */}
          <Card className="border-none shadow-xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Section 3 of 6
                </p>
                <h3 className="text-lg font-black text-foreground uppercase italic flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Top Skills to Add
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Add these in LinkedIn → Profile → Skills
                </p>
              </div>
              <CopyButton text={result.skills.join(", ")} id="skills" />
            </CardHeader>
            <CardContent className="p-8 pt-5">
              <div className="flex flex-wrap gap-2">
                {result.skills.map((skill, i) => (
                  <div
                    key={i}
                    className="bg-primary/10 text-primary dark:text-leaf border border-primary/25 px-4 py-1.5 rounded-xl text-sm font-bold"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Experience Bullets */}
          {result.experienceBullets && result.experienceBullets.length > 0 && (
            <Card className="border-none shadow-xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    Section 4 of 6
                  </p>
                  <h3 className="text-lg font-black text-foreground uppercase italic flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Experience Bullet
                    Points
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Replace your current experience descriptions with these
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-5 space-y-6">
                {result.experienceBullets.map((exp, i) => (
                  <div
                    key={i}
                    className="bg-muted/40 rounded-2xl border border-border p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-foreground text-base">{exp.role}</p>
                        <p className="text-sm text-muted-foreground font-semibold">
                          {exp.company}
                        </p>
                      </div>
                      <CopyButton text={exp.bullets.join("\n")} id={`exp-${i}`} />
                    </div>
                    <ul className="space-y-2">
                      {exp.bullets.map((bullet, j) => (
                        <li
                          key={j}
                          className="text-sm text-foreground font-medium leading-relaxed"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 5. Connection Message */}
          <Card className="border-none shadow-xl bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Section 5 of 6
                </p>
                <h3 className="text-lg font-black text-foreground uppercase italic flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Connection Request Message
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Customise [Name] and [Company] before sending
                </p>
              </div>
              <CopyButton text={result.connectionMessage} id="connection" />
            </CardHeader>
            <CardContent className="p-8 pt-5">
              <div className="bg-muted/40 p-6 rounded-2xl border border-border">
                <p className="text-base text-foreground leading-relaxed font-medium italic">
                  &ldquo;{result.connectionMessage}&rdquo;
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 6. Profile Strength Tips */}
          <Card className="border-none shadow-xl bg-ink text-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-0">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-leaf">
                  Section 6 of 6
                </p>
                <h3 className="text-lg font-black text-white uppercase italic flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-leaf" /> Profile Strength Tips
                </h3>
                <p className="text-xs text-white/75 font-medium">
                  Actions to take to maximise your recruiter visibility
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-5">
              <ul className="space-y-3">
                {result.profileStrengthTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-black text-ink">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-white/90">
                      {tip}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex flex-col-reverse sm:flex-row gap-6 justify-between pt-8">
            <button
              onClick={() => setCurrentStep(4)}
              className="w-full sm:w-auto text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Rewrites
            </button>
            <Button
              onClick={() => setCurrentStep(6)}
              className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 text-lg font-black uppercase tracking-widest cursor-pointer"
            >
              Proceed to Updated CV
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center items-center gap-1.5 py-4 opacity-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
            ))}
            <div className="w-8 h-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.42_0.1_155/0.35)]"></div>
          </div>
        </div>
      )}
    </div>
  );
}
