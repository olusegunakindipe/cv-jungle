export interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string[]; // Bullet points
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
}

export interface StructuredCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Experience[];
  skills: string[];
  education: Education[];
}

export interface RoleDetails {
  title: string;
  seniority?: string;
  industry?: string;
}

export interface AnalysisResult {
  score: number;
  /** Optimization-focused narrative (what we will improve for ATS/recruiters) */
  summaryAssessment: string;
  foundKeywords: string[];
  missingKeywords: string[];
  /** Role-targeted professional summary ready for the CV */
  optimizedSummary?: string;
}

export interface RewriteSuggestion {
  originalSentence: string;
  rewrittenSentence: string;
  reasoning: string;
}

export interface RewriteResult {
  improvements: RewriteSuggestion[];
}

export interface LinkedInResult {
  headline: string;
  about: string;
  skills: string[];
  experienceBullets: { role: string; company: string; bullets: string[] }[];
  connectionMessage: string;
  profileStrengthTips: string[];
}
