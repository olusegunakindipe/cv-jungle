"use client";

import { useState, useEffect } from "react";
import { useCVContext } from "@/lib/cv-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  BriefcaseBusiness,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Zap,
  Sparkles,
  Target,
  Building2,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { clearRequestCaches, roleFingerprint } from "@/lib/request-lock";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COMMON_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile App Developer (iOS/Android)",
  "Embedded Systems Engineer",
  "Cloud Architect",
  "DevOps Engineer",
  "Site Reliability Engineer (SRE)",
  "Cybersecurity Analyst",
  "Systems Administrator",
  "Data Scientist",
  "Data Analyst",
  "Data Engineer",
  "Machine Learning Engineer",
  "AI Research Scientist",
  "Business Intelligence Developer",
  "Product Manager",
  "Technical Product Manager",
  "Project Manager (Agile/PMP)",
  "Program Manager",
  "UX Designer / Researcher",
  "UI Designer",
  "Product Designer",
  "Creative Director",
  "Marketing Manager",
  "Digital Marketing Specialist",
  "SEO/SEM Expert",
  "Content Strategist",
  "Social Media Manager",
  "Financial Analyst",
  "Investment Banker",
  "Accountant (CPA)",
  "Risk Manager",
  "Sales Executive / Account Manager",
  "Business Development Manager",
  "Customer Success Manager",
  "HR Manager / Talent Acquisition",
  "Operations Manager",
  "Business Analyst",
  "Strategy Consultant",
  "Executive Assistant",
  "Legal Counsel",
  "Compliance Officer",
  "Medical Professional / Healthcare Admin",
];

const EXPERIENCE_LEVELS = [
  "Entry Level",
  "Mid Level",
  "Senior",
  "Manager",
  "Executive",
] as const;

const COMMON_INDUSTRIES = [
  "Software & Technology",
  "SaaS",
  "FinTech",
  "Banking & Financial Services",
  "Insurance",
  "Healthcare",
  "Biotech & Pharmaceuticals",
  "Education & EdTech",
  "E-commerce",
  "Retail",
  "Consulting",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Telecommunications",
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
  "Manufacturing",
  "Automotive",
  "Aerospace & Defense",
  "Energy & Utilities",
  "Climate Tech / Clean Energy",
  "Real Estate & PropTech",
  "Logistics & Supply Chain",
  "Hospitality & Travel",
  "Government & Public Sector",
  "Non-profit & NGO",
  "Legal Services",
  "Construction & Engineering",
  "Agriculture & AgTech",
  "Gaming",
  "Consumer Goods (CPG)",
  "Human Resources / HR Tech",
];

export function RoleSelection() {
  const {
    parsedText,
    roleDetails,
    setRoleDetails,
    setCurrentStep,
    isHydrated,
    structuredCV,
    setStructuredCV,
    setKeywordAnalysis,
    setAiRewrites,
    setLinkedInSuggestions,
  } = useCVContext();

  const [roleOpen, setRoleOpen] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);
  const [title, setTitle] = useState(roleDetails?.title || "");
  const [seniority, setSeniority] = useState(roleDetails?.seniority || "");
  const [industry, setIndustry] = useState(roleDetails?.industry || "");
  const [error, setError] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");

  useEffect(() => {
    if (!isHydrated) return;
    if (!parsedText) {
      toast.error("Please upload your CV first.", { id: "missing-cv" });
      setCurrentStep(1);
    }
  }, [isHydrated, parsedText, setCurrentStep]);

  const handleContinue = () => {
    const finalTitle = title || roleSearch;
    const finalIndustry = industry || industrySearch;

    if (!finalTitle.trim()) {
      setError("Please select or type a target role.");
      return;
    }

    const nextRole = {
      title: finalTitle.trim(),
      seniority: seniority.trim(),
      industry: finalIndustry.trim(),
    };

    const targetChanged = roleFingerprint(roleDetails) !== roleFingerprint(nextRole);

    setRoleDetails(nextRole);

    // Changing seniority/industry/title must re-run analysis + rewrites
    if (targetChanged) {
      clearRequestCaches();
      setKeywordAnalysis(null);
      setAiRewrites(null);
      setLinkedInSuggestions(null);
      // Drop previous target-framed summary so the next pass rebuilds from real experience
      if (structuredCV) {
        setStructuredCV({ ...structuredCV, summary: "" });
      }
    }

    setCurrentStep(3);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/20 dark:border-primary/25">
          <Zap className="w-3 h-3" />
          Step 02: Market Alignment
        </div>
        <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
          Define Your{" "}
          <span className="text-primary dark:text-primary not-italic">Target Role</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto font-medium">
          Our AI uses role-based intelligence to build a custom ATS profile. No job
          description needed.
        </p>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-card/95 backdrop-blur-md ring-1 ring-border rounded-[3rem] overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.07] transform translate-x-1/4 -translate-y-1/4 text-primary pointer-events-none">
          <BriefcaseBusiness className="w-96 h-96" />
        </div>

        <CardContent className="p-8 md:p-12 space-y-10 relative z-10">
          {/* Role title */}
          <div className="space-y-4">
            <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Role Title <span className="text-primary">*</span>
            </Label>

            <Popover open={roleOpen} onOpenChange={setRoleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={roleOpen}
                  className={cn(
                    "w-full justify-between h-16 text-lg font-bold rounded-2xl border-border hover:bg-muted/50 transition-all",
                    !title && !roleSearch && "text-muted-foreground font-medium"
                  )}
                >
                  <span className="flex items-center gap-3 truncate">
                    <BriefcaseBusiness className="w-5 h-5 text-primary shrink-0" />
                    {title || roleSearch || "Project Manager, UX Lead, Engineer..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 rounded-2xl shadow-2xl border-border"
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder="Search standard roles or type your own..."
                    value={roleSearch}
                    onValueChange={(val) => {
                      setRoleSearch(val);
                      setTitle(val);
                      setError("");
                    }}
                    className="h-14 font-medium"
                  />
                  <CommandList className="max-h-[350px] overflow-y-auto">
                    <CommandEmpty className="p-0">
                      <div className="p-6 text-center space-y-4">
                        <p className="text-sm text-muted-foreground font-medium">
                          No standard matches found.
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setTitle(roleSearch);
                            setRoleOpen(false);
                            setError("");
                          }}
                          className="w-full h-12 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 border-none font-bold"
                        >
                          Use &quot;{roleSearch}&quot; as target
                        </Button>
                      </div>
                    </CommandEmpty>

                    {roleSearch &&
                      !COMMON_ROLES.some(
                        (r) => r.toLowerCase() === roleSearch.toLowerCase()
                      ) && (
                        <CommandGroup heading="Custom Entry">
                          <CommandItem
                            value={roleSearch}
                            onSelect={() => {
                              setTitle(roleSearch);
                              setRoleOpen(false);
                              setError("");
                            }}
                            className="py-4 px-6 cursor-pointer"
                          >
                            <Sparkles className="mr-3 h-5 w-5 text-primary" />
                            <span className="font-bold">
                              Create custom role: &quot;{roleSearch}&quot;
                            </span>
                          </CommandItem>
                        </CommandGroup>
                      )}

                    <CommandGroup heading="Industry Standards">
                      {COMMON_ROLES.map((role) => (
                        <CommandItem
                          key={role}
                          value={role}
                          onSelect={(currentValue) => {
                            setTitle(currentValue);
                            setRoleSearch(currentValue);
                            setRoleOpen(false);
                            setError("");
                          }}
                          className="py-4 px-6 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-3 h-5 w-5 text-primary",
                              title === role ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="font-bold text-sm">{role}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/50">
            {/* Experience Level dropdown */}
            <div className="space-y-4">
              <Label
                htmlFor="experience-level"
                className="text-sm font-black uppercase tracking-widest text-muted-foreground"
              >
                Experience Level
              </Label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
                <select
                  id="experience-level"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full h-14 pl-12 pr-10 rounded-2xl border border-border bg-transparent font-sans font-bold text-foreground appearance-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 cursor-pointer"
                >
                  <option value="" disabled>
                    Select experience level
                  </option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* Industry combobox — list + custom */}
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Target Industry
              </Label>
              <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={industryOpen}
                    className={cn(
                      "w-full justify-between h-14 font-bold rounded-2xl border-border hover:bg-muted/50",
                      !industry && !industrySearch && "text-muted-foreground font-medium"
                    )}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Building2 className="w-5 h-5 text-primary shrink-0" />
                      {industry || industrySearch || "FinTech, Healthcare, SaaS..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0 rounded-2xl shadow-2xl border-border"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search industries or type your own..."
                      value={industrySearch}
                      onValueChange={(val) => {
                        setIndustrySearch(val);
                        setIndustry(val);
                      }}
                      className="h-12 font-medium"
                    />
                    <CommandList className="max-h-[280px] overflow-y-auto">
                      <CommandEmpty className="p-0">
                        <div className="p-4">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setIndustry(industrySearch);
                              setIndustryOpen(false);
                            }}
                            className="w-full h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 border-none font-bold"
                          >
                            Use &quot;{industrySearch}&quot;
                          </Button>
                        </div>
                      </CommandEmpty>

                      {industrySearch &&
                        !COMMON_INDUSTRIES.some(
                          (i) => i.toLowerCase() === industrySearch.toLowerCase()
                        ) && (
                          <CommandGroup heading="Custom">
                            <CommandItem
                              value={industrySearch}
                              onSelect={() => {
                                setIndustry(industrySearch);
                                setIndustryOpen(false);
                              }}
                              className="py-3 px-4 cursor-pointer"
                            >
                              <Sparkles className="mr-3 h-4 w-4 text-primary" />
                              <span className="font-bold text-sm">
                                Use &quot;{industrySearch}&quot;
                              </span>
                            </CommandItem>
                          </CommandGroup>
                        )}

                      <CommandGroup heading="Industries">
                        {COMMON_INDUSTRIES.map((item) => (
                          <CommandItem
                            key={item}
                            value={item}
                            onSelect={(val) => {
                              setIndustry(val);
                              setIndustrySearch(val);
                              setIndustryOpen(false);
                            }}
                            className="py-3 px-4 cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-3 h-4 w-4 text-primary",
                                industry === item ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-bold text-sm">{item}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/50 text-center">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col-reverse sm:flex-row gap-6 justify-between sm:items-center p-8 md:p-12 pt-0 relative z-10">
          <button
            onClick={() => setCurrentStep(1)}
            className="w-full sm:w-auto text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Upload
          </button>
          <Button
            onClick={handleContinue}
            className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 text-lg font-black uppercase tracking-widest overflow-hidden group relative cursor-pointer"
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            Continue
            <Sparkles className="h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
        <div className="p-6 bg-card rounded-3xl border border-border/50 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <Target className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground italic">
            Semantic Gap
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            ATS systems look for semantic match. Choosing the right role lets our AI
            predict the skills recruiters filter for.
          </p>
        </div>

        <div className="p-6 bg-card rounded-3xl border border-border/50 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground italic">
            Experience Level
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Entry vs Executive shifts rewrites from execution detail toward strategy and
            leadership impact.
          </p>
        </div>

        <div className="p-6 bg-card rounded-3xl border border-border/50 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground italic">
            LinkedIn Sync
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Industry alignment tunes your LinkedIn headline for recruiter search in your
            target market.
          </p>
        </div>
      </div>

      <div className="flex justify-center items-center gap-1.5 py-4 opacity-50">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        <div className="w-8 h-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.42_0.1_155/0.35)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted" />
        <div className="w-1.5 h-1.5 rounded-full bg-muted" />
      </div>
    </div>
  );
}
