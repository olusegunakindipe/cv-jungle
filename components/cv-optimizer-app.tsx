"use client";

import Link from "next/link";
import { UploadCV } from "@/components/upload-cv";
import { RoleSelection } from "@/components/role-selection";
import { KeywordAnalysis } from "@/components/keyword-analysis";
import { AIRewrites } from "@/components/ai-rewrites";
import { LinkedInSuggestions } from "@/components/linkedin-suggestions";
import { FinalReview } from "@/components/final-review";
import { useCVContext } from "@/lib/cv-context";
import {
  CheckCircle2,
  Sparkles,
  Target,
  FileText,
  Network,
  Download,
  Cpu,
} from "lucide-react";

export function CvOptimizerApp() {
  const { currentStep, isDemoMode } = useCVContext();

  const steps = [
    { id: 1, title: "Upload", icon: FileText },
    { id: 2, title: "Align", icon: Target },
    { id: 3, title: "Analyze", icon: Cpu },
    { id: 4, title: "Improve", icon: Sparkles },
    { id: 5, title: "LinkedIn", icon: Network },
    { id: 6, title: "Updated", icon: Download },
  ];

  return (
    <div className="site-atmosphere min-h-screen text-foreground selection:bg-primary/20">
      {isDemoMode && (
        <div className="bg-amber-600 text-white text-[10px] sm:text-xs font-bold py-2 text-center tracking-widest uppercase">
          Demo Mode: Showing sample data
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-display text-xl tracking-tight text-foreground">
            CV<span className="text-primary">Jungle</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 rounded-xl border border-border/60 bg-card/70 p-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  currentStep === step.id
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : currentStep > step.id
                      ? "text-primary/70"
                      : "text-muted-foreground opacity-60"
                }`}
              >
                <step.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{step.title}</span>
                {currentStep > step.id && <CheckCircle2 className="ml-0.5 h-3 w-3" />}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="md:hidden text-[10px] font-bold tracking-wider text-primary">
              STEP {currentStep} / 6
            </span>
            <HeaderActions />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        {currentStep === 1 && (
          <div className="mb-10 max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Step 1 · Upload
            </p>
            <h1 className="font-display text-3xl tracking-tight text-foreground md:text-4xl">
              Start from your real CV
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              We will align wording to your target role and generate matching LinkedIn
              copy — without inventing skills.
            </p>
          </div>
        )}

        {currentStep === 1 && <UploadCV />}
        {currentStep === 2 && <RoleSelection />}
        {currentStep === 3 && <KeywordAnalysis />}
        {currentStep === 4 && <AIRewrites />}
        {currentStep === 5 && <LinkedInSuggestions />}
        {currentStep === 6 && <FinalReview />}
      </main>
    </div>
  );
}

function HeaderActions() {
  const { resetProgress, parsedText } = useCVContext();

  if (!parsedText) {
    return (
      <Link
        href="/"
        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        Home
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Reset progress? This clears uploaded data for this session.")) {
          resetProgress();
        }
      }}
      className="rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-600"
    >
      Reset
    </button>
  );
}
