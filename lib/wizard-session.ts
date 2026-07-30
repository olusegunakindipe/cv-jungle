import type {
  AnalysisResult,
  LinkedInResult,
  RewriteResult,
  RoleDetails,
  StructuredCV,
} from "@/types/cv";

export const WIZARD_SESSION_KEY = "cvjungle_wizard_v1";

const LEGACY_KEYS = [
  "elitepro_parsedText",
  "elitepro_roleDetails",
  "elitepro_structuredCV",
  "elitepro_keywordAnalysis",
  "elitepro_aiRewrites",
  "elitepro_linkedInSuggestions",
];

export type WizardSessionSnapshot = {
  v: 1;
  parsedText: string;
  structuredCV: StructuredCV | null;
  roleDetails: RoleDetails | null;
  keywordAnalysis: AnalysisResult | null;
  aiRewrites: RewriteResult | null;
  linkedInSuggestions: LinkedInResult | null;
  step: number;
  isDemoMode: boolean;
};

export function clearLegacyWizardKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function loadWizardSession(): WizardSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WIZARD_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WizardSessionSnapshot;
    if (data?.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveWizardSession(snapshot: WizardSessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WIZARD_SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearWizardSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(WIZARD_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
