"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { clearRequestCaches } from "@/lib/request-lock";
import {
  clearLegacyWizardKeys,
  clearWizardSession,
  loadWizardSession,
  saveWizardSession,
} from "@/lib/wizard-session";
import {
  MOCK_STRUCTURED_CV,
  MOCK_ANALYSIS_RESULT,
  MOCK_REWRITE_RESULT,
  MOCK_LINKEDIN_RESULT,
} from "./mock-data";

import {
  StructuredCV,
  RoleDetails,
  AnalysisResult,
  RewriteResult,
  LinkedInResult,
} from "@/types/cv";

interface CVContextType {
  parsedText: string;
  setParsedText: (text: string) => void;
  structuredCV: StructuredCV | null;
  setStructuredCV: (data: StructuredCV | null) => void;
  roleDetails: RoleDetails | null;
  setRoleDetails: (details: RoleDetails | null) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  keywordAnalysis: AnalysisResult | null;
  setKeywordAnalysis: (data: AnalysisResult | null) => void;
  aiRewrites: RewriteResult | null;
  setAiRewrites: (data: RewriteResult | null) => void;
  linkedInSuggestions: LinkedInResult | null;
  setLinkedInSuggestions: (data: LinkedInResult | null) => void;
  isStructuring: boolean;
  setIsStructuring: (val: boolean) => void;
  structuringFailed: boolean;
  setStructuringFailed: (val: boolean) => void;
  isDemoMode: boolean;
  demoEnabled: boolean;
  isHydrated: boolean;
  loadDemoData: () => void;
  resetProgress: () => void;
}

const CVContext = createContext<CVContextType | undefined>(undefined);

export function CVProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [parsedText, setParsedText] = useState("");
  const [structuredCV, setStructuredCV] = useState<StructuredCV | null>(null);
  const [roleDetails, setRoleDetails] = useState<RoleDetails | null>(null);
  const [keywordAnalysis, setKeywordAnalysis] = useState<AnalysisResult | null>(null);
  const [aiRewrites, setAiRewrites] = useState<RewriteResult | null>(null);
  const [linkedInSuggestions, setLinkedInSuggestions] = useState<LinkedInResult | null>(
    null
  );
  const [isStructuring, setIsStructuring] = useState(false);
  const [structuringFailed, setStructuringFailed] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const searchParamsValue = searchParams?.get("step");
  const currentStep = searchParamsValue ? parseInt(searchParamsValue, 10) : 1;

  // Restore wizard progress from sessionStorage so Back / refresh
  // does not re-trigger LLM calls.
  useEffect(() => {
    clearLegacyWizardKeys();
    const saved = loadWizardSession();
    if (saved) {
      setParsedText(saved.parsedText || "");
      setStructuredCV(saved.structuredCV);
      setRoleDetails(saved.roleDetails);
      setKeywordAnalysis(saved.keywordAnalysis);
      setAiRewrites(saved.aiRewrites);
      setLinkedInSuggestions(saved.linkedInSuggestions);
      setIsDemoMode(Boolean(saved.isDemoMode));

      // Prefer URL step; if missing/invalid, restore saved step
      const urlStep = searchParams?.get("step");
      const parsedUrl = urlStep ? parseInt(urlStep, 10) : NaN;
      if (
        (!urlStep || Number.isNaN(parsedUrl)) &&
        saved.step >= 1 &&
        saved.step <= 6 &&
        pathname
      ) {
        router.replace(`${pathname}?step=${saved.step}`);
      }
    }
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress (tab session only — clears when browser tab closes)
  useEffect(() => {
    if (!isHydrated) return;
    saveWizardSession({
      v: 1,
      parsedText,
      structuredCV,
      roleDetails,
      keywordAnalysis,
      aiRewrites,
      linkedInSuggestions,
      step: Number.isFinite(currentStep) ? currentStep : 1,
      isDemoMode,
    });
  }, [
    isHydrated,
    parsedText,
    structuredCV,
    roleDetails,
    keywordAnalysis,
    aiRewrites,
    linkedInSuggestions,
    currentStep,
    isDemoMode,
  ]);

  const setCurrentStep = useCallback(
    (step: number) => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("step", step.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const demoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";

  const loadDemoData = useCallback(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO !== "true") {
      toast.error("Demo mode is disabled. Upload a real CV instead.");
      return;
    }
    setIsDemoMode(true);
    setParsedText("This is a demo CV text for Jordan Smith.");
    setRoleDetails({
      title: "Senior Full Stack Engineer",
      seniority: "Senior",
      industry: "Software & Technology",
    });
    setStructuredCV(MOCK_STRUCTURED_CV);
    setKeywordAnalysis(MOCK_ANALYSIS_RESULT);
    setAiRewrites(MOCK_REWRITE_RESULT);
    setLinkedInSuggestions(MOCK_LINKEDIN_RESULT);
    setCurrentStep(3);
  }, [setCurrentStep]);

  const resetProgress = useCallback(() => {
    clearRequestCaches();
    clearWizardSession();
    setParsedText("");
    setStructuredCV(null);
    setRoleDetails(null);
    setKeywordAnalysis(null);
    setAiRewrites(null);
    setLinkedInSuggestions(null);
    setIsDemoMode(false);
    setStructuringFailed(false);
    router.push("/optimize?step=1");
    toast?.success("Progress reset successfully");
  }, [router]);

  return (
    <CVContext.Provider
      value={{
        parsedText,
        setParsedText,
        structuredCV,
        setStructuredCV,
        roleDetails,
        setRoleDetails,
        currentStep,
        setCurrentStep,
        keywordAnalysis,
        setKeywordAnalysis,
        aiRewrites,
        setAiRewrites,
        linkedInSuggestions,
        setLinkedInSuggestions,
        isStructuring,
        setIsStructuring,
        structuringFailed,
        setStructuringFailed,
        isDemoMode,
        demoEnabled,
        isHydrated,
        loadDemoData,
        resetProgress,
      }}
    >
      {children}
    </CVContext.Provider>
  );
}

export function useCVContext() {
  const context = useContext(CVContext);
  if (context === undefined) {
    throw new Error("useCVContext must be used within a CVProvider");
  }
  return context;
}

export type { StructuredCV, AnalysisResult, RewriteResult, LinkedInResult };
