import {
  StructuredCV,
  AnalysisResult,
  RewriteResult,
  LinkedInResult,
} from "./cv-context";

export const MOCK_STRUCTURED_CV: StructuredCV = {
  name: "Jordan Smith",
  email: "jordan.smith@example.com",
  phone: "+1 (555) 012-3456",
  location: "San Francisco, CA",
  summary:
    "Results-driven Software Engineer with 5+ years of experience in building scalable web applications. Passionate about clean code, performance optimization, and mentoring junior developers.",
  experience: [
    {
      company: "TechFlow Systems",
      role: "Senior Full Stack Engineer",
      duration: "Jan 2021 - Present",
      description: [
        "Led a team of 5 to rebuild the core customer portal using Next.js and TypeScript, improving page load speeds by 40%.",
        "Implemented a microservices architecture using Node.js and AWS Lambda, reducing server costs by 25%.",
        "Designed and maintained scalable PostgreSQL databases handling 1M+ daily transactions.",
        "Collaborated with UX designers to implement a new design system, increasing user engagement by 15%.",
      ],
    },
    {
      company: "DataBright Analytics",
      role: "Software Developer",
      duration: "June 2018 - Dec 2020",
      description: [
        "Developed data visualization dashboards using React and D3.js for enterprise clients.",
        "Optimized API endpoints resulting in a 30% reduction in latency.",
        "Contributed to an internal CI/CD pipeline, reducing deployment time by 20 minutes.",
        "Wrote 200+ unit tests with Jest, achieving 90% code coverage for the frontend team.",
      ],
    },
  ],
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "Docker",
    "GraphQL",
    "Tailwind CSS",
    "Git",
    "Agile",
    "Unit Testing",
  ],
  education: [
    {
      institution: "State University of Technology",
      degree: "B.S. in Computer Science",
      year: "2018",
    },
  ],
};

export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  score: 62,
  summaryAssessment:
    "Solid foundation for Senior Engineering roles, but several role-critical keywords are missing. Strengthening cloud, DevOps, and architecture terminology will significantly improve ATS match rate.",
  foundKeywords: ["TypeScript", "Next.js", "AWS", "Node.js", "Unit Testing"],
  missingKeywords: ["Terraform", "Kubernetes", "Redis", "CI/CD", "System Design", "SOC2"],
};

export const MOCK_REWRITE_RESULT: RewriteResult = {
  improvements: [
    {
      originalSentence:
        "Led a team of 5 to rebuild the core customer portal using Next.js and TypeScript, improving page load speeds by 40%.",
      rewrittenSentence:
        "Orchestrated a team of 5 to rebuild the core customer portal with Next.js and TypeScript, improving page load speeds by 40% and establishing scalable system design patterns.",
      reasoning:
        "Uses stronger leadership language and surfaces system design for ATS keyword coverage.",
    },
    {
      originalSentence:
        "Implemented a microservices architecture using Node.js and AWS Lambda, reducing server costs by 25%.",
      rewrittenSentence:
        "Implemented a microservices architecture on Node.js and AWS Lambda with CI/CD automation, reducing server costs by 25% while improving release reliability.",
      reasoning: "Adds CI/CD terminology and ties cost savings to delivery reliability.",
    },
    {
      originalSentence:
        "Wrote 200+ unit tests with Jest, achieving 90% code coverage for the frontend team.",
      rewrittenSentence:
        "Established a testing culture with 200+ Jest unit tests, achieving 90% coverage and reducing production regressions across the frontend platform.",
      reasoning: "Connects testing work to measurable quality outcomes.",
    },
  ],
};

export const MOCK_LINKEDIN_RESULT: LinkedInResult = {
  headline:
    "Senior Full Stack Engineer | Next.js & AWS Specialist | Building Scalable Enterprise Systems",
  about:
    "I'm a Senior Full Stack Engineer passionate about bridging the gap between high-level architecture and pixel-perfect implementation. At TechFlow Systems, I led the transition to a modern Next.js stack, delivering a 40% performance improvement and 25% cost reduction.\n\nI thrive in environments that challenge me to solve complex scalability problems while mentoring the next generation of engineers. My approach combines rigorous engineering principles with a product mindset — I don't just build features, I solve real business problems.\n\nCurrently open to senior engineering roles where I can drive meaningful impact from day one. Let's connect!",
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "AWS",
    "PostgreSQL",
    "Docker",
    "GraphQL",
    "System Design",
    "Agile",
    "CI/CD",
    "Team Leadership",
  ],
  experienceBullets: [
    {
      role: "Senior Full Stack Engineer",
      company: "TechFlow Systems",
      bullets: [
        "▸ Orchestrated the architectural redesign of the core customer portal, leading a 5-person team to deliver a 40% performance improvement.",
        "▸ Implemented microservices architecture using Node.js and AWS Lambda, reducing server infrastructure costs by 25%.",
        "▸ Designed scalable PostgreSQL databases handling 1M+ daily transactions with 99.9% uptime.",
      ],
    },
    {
      role: "Software Developer",
      company: "DataBright Analytics",
      bullets: [
        "▸ Engineered high-performance API optimizations that reduced latency by 30% across the core data layer.",
        "▸ Established a robust testing culture with 200+ Jest unit tests, achieving 90% code coverage.",
        "▸ Contributed to CI/CD pipeline improvements reducing deployment time by 20 minutes per release.",
      ],
    },
  ],
  connectionMessage:
    "Hi [Name], I came across your profile and was impressed by your work at [Company]. As a Senior Full Stack Engineer myself, I'd love to connect and share insights about scalable engineering and tech leadership. Looking forward to building a meaningful connection!",
  profileStrengthTips: [
    "Add a professional headshot — profiles with photos get 14x more views from recruiters",
    "Request 3+ recommendations from former managers or senior colleagues to boost credibility",
    "Enable 'Open to Work' (visible only to recruiters) for passive inbound opportunities",
    "Post one technical insight or article per week to stay visible in your network feed",
  ],
};
