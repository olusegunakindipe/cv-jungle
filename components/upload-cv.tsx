"use client";

import { useState } from "react";
import { useCVContext } from "@/lib/cv-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  UploadCloud,
  FileText,
  Loader2,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function UploadCV() {
  const { parsedText, setParsedText, setCurrentStep, loadDemoData, demoEnabled } =
    useCVContext();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      // Clear parsed text when a new file is intentionally selected
      setParsedText("");
    }
  };

  const handleUpload = async () => {
    // If we already have parsed text and no new file is queued, just proceed
    if (parsedText && !file) {
      setCurrentStep(2);
      return;
    }

    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to parse file");
      }

      const data = await res.json();
      setParsedText(data.text);

      // Phase 1 is complete — just text extraction, no AI needed here.
      // Structuring happens later in FinalReview (Phase 6) when the API key is available.
      setCurrentStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Centered Upload Interface */}
      <Card className="p-1 md:p-12 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-white/95 dark:bg-ink/90 backdrop-blur-md ring-1 ring-slate-200/50 dark:ring-slate-800 rounded-[3rem] relative overflow-hidden group">
        {/* Decorative AI Background Elements */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.07] transform translate-x-1/4 -translate-y-1/4 text-primary pointer-events-none">
          <Sparkles className="w-96 h-96" />
        </div>

        <div className="relative z-10 space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 border border-primary/20 dark:border-primary/25">
              <Zap className="w-3 h-3" />
              Step 01: Data Extraction
            </div>
            <h3 className="text-4xl font-black tracking-tight text-foreground">
              Upload your{" "}
              <span className="text-primary dark:text-primary">Original CV</span>
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto font-medium">
              We&apos;ll extract your professional DNA into a structured format for
              high-fidelity optimization.
            </p>
          </div>

          <div className="relative border-4 border-dashed border-primary/20 dark:border-primary/30 hover:border-primary dark:hover:border-primary rounded-[2.5rem] p-12 transition-all group flex flex-col justify-center items-center min-h-[320px] bg-muted/30 hover:bg-primary/10 dark:hover:bg-primary/10 cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            <div className="flex flex-col items-center justify-center space-y-6 pointer-events-none transition-transform duration-500 group-hover:scale-105">
              <div className="w-24 h-24 bg-card text-primary dark:text-primary rounded-3xl flex items-center justify-center shadow-xl shadow-primary/10 ring-1 ring-primary/20">
                {file ? (
                  <FileText className="w-12 h-12" />
                ) : (
                  <UploadCloud className="w-12 h-12" />
                )}
              </div>
              <div className="space-y-2 text-center">
                <p className="text-xl font-bold text-foreground">
                  {file ? file.name : "Choose your CV file"}
                </p>
                <p className="text-sm text-muted-foreground font-medium italic">
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                    : "PDF or DOCX supported (Max 10MB)"}
                </p>
              </div>
            </div>

            {/* Success Overlay if file selected */}
            {file && !error && (
              <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/50 animate-in shake duration-500 text-center">
              {error}
            </div>
          )}

          {!file && parsedText && (
            <div className="flex items-center justify-center gap-3 bg-primary/10 dark:bg-primary/15 p-4 rounded-2xl border border-primary/25 dark:border-primary/30 text-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <p className="text-sm font-bold text-primary dark:text-primary-foreground">
                Your CV is loaded and ready. Upload again to replace it.
              </p>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <Button
              onClick={handleUpload}
              disabled={(!file && !parsedText) || loading}
              className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-[1.25rem] bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01] disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer relative z-40 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Extracting DNA...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Proceed
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>

            {demoEnabled && (
              <>
                <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    or
                  </span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>

                <button
                  onClick={loadDemoData}
                  className="w-full py-4 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Try with Demo Data (Skip Upload)
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Security/Trust Badges */}
      <div className="flex justify-center gap-8 mt-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <ShieldCheck className="w-4 h-4" /> 256-bit Encryption
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <CheckCircle2 className="w-4 h-4" /> GDPR Compliant
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Zap className="w-4 h-4" /> AI Guardrails Active
        </div>
      </div>
    </div>
  );
}
