import type { Metadata } from "next";

const siteName = "CVJungle";
const defaultTitle = "CVJungle | Optimize Your CV & LinkedIn — Truthful ATS Rewrites";
const defaultDescription =
  "CVJungle helps you cut through the job-search jungle: refine your CV and LinkedIn for a target role, rewrite bullets without inventing skills, and export an ATS-friendly PDF.";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

/** Avoid indexing localhost / preview hosts without a real public domain. */
export function isIndexableSite(): boolean {
  if (process.env.NEXT_PUBLIC_SEO_INDEX === "false") return false;
  if (process.env.NEXT_PUBLIC_SEO_INDEX === "true") return true;
  const url = getSiteUrl().toLowerCase();
  if (url.includes("localhost") || url.includes("127.0.0.1")) return false;
  if (url.includes(".vercel.app")) {
    // Preview deployments: only index when explicitly opted in
    return process.env.NEXT_PUBLIC_SEO_INDEX === "true";
  }
  return true;
}

export const siteConfig = {
  name: siteName,
  title: defaultTitle,
  description: defaultDescription,
  keywords: [
    "CVJungle",
    "cvjungle",
    "CV optimizer",
    "resume optimizer",
    "optimize CV",
    "optimize resume",
    "ATS resume",
    "ATS friendly CV",
    "truthful resume rewrite",
    "LinkedIn headline generator",
    "LinkedIn About generator",
    "LinkedIn profile optimization",
    "CV and LinkedIn optimizer",
    "role based resume",
    "industry resume rewrite",
    "beat the ATS",
    "applicant tracking system resume",
  ],
};

export function buildMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const indexable = isIndexableSite();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultTitle,
      template: `%s | ${siteName}`,
    },
    description: defaultDescription,
    keywords: siteConfig.keywords,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    applicationName: siteName,
    category: "career",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName,
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "CVJungle — truthful CV and LinkedIn optimization for ATS",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/opengraph-image"],
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}

export function buildJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        description: defaultDescription,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en",
        potentialAction: {
          "@type": "Action",
          name: "Optimize CV",
          target: `${siteUrl}/optimize`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Optimize",
            item: `${siteUrl}/optimize`,
          },
        ],
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        description:
          "CVJungle helps job seekers align CVs and LinkedIn profiles to target roles without inventing skills.",
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: defaultTitle,
        description: defaultDescription,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: [
          { "@type": "Thing", name: "CV optimization for ATS" },
          { "@type": "Thing", name: "LinkedIn profile optimization" },
        ],
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/opengraph-image`,
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "CVJungle",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: defaultDescription,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Role, seniority, and industry CV alignment",
          "Truthful bullet rewrites from real experience",
          "LinkedIn headline, About, skills, and connection copy",
          "ATS-friendly text PDF export",
        ],
      },
      {
        "@type": "HowTo",
        name: "How to align your CV and LinkedIn with CVJungle",
        description:
          "Upload your resume, choose a target role, improve truthful wording, generate LinkedIn copy, and download an ATS-friendly CV.",
        step: [
          {
            "@type": "HowToStep",
            name: "Upload your CV",
            text: "Upload a PDF or DOCX so CVJungle can structure your real experience.",
          },
          {
            "@type": "HowToStep",
            name: "Choose role, seniority, and industry",
            text: "Tell CVJungle what you are targeting so rewrites and LinkedIn copy stay aligned.",
          },
          {
            "@type": "HowToStep",
            name: "Review ATS alignment",
            text: "See match score and phrasing opportunities grounded only in your CV.",
          },
          {
            "@type": "HowToStep",
            name: "Apply truthful rewrites",
            text: "Strengthen bullets without inventing tools, employers, or achievements.",
          },
          {
            "@type": "HowToStep",
            name: "Generate LinkedIn + download CV",
            text: "Copy matching LinkedIn headline and About, then export an ATS-readable PDF.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How is CVJungle different from other CV optimizers?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "CVJungle aligns your existing experience to a target role, seniority, and industry. It does not invent skills or stacks you never used, and it generates LinkedIn headline and About copy from the same improved CV.",
            },
          },
          {
            "@type": "Question",
            name: "Can CVJungle optimize my LinkedIn profile?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. CVJungle generates a LinkedIn headline, About section, skills list, experience bullets, and a connection message that mirror your improved CV so recruiters see one consistent story.",
            },
          },
          {
            "@type": "Question",
            name: "Does CVJungle invent skills for ATS?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Rewrites and keywords must be supported by your uploaded CV. Industry targeting reframes transferable value rather than adding fake tools.",
            },
          },
          {
            "@type": "Question",
            name: "What is an ATS-friendly CV?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "An ATS-friendly CV uses a clean single-column layout, standard headings, and role-relevant keywords from your real experience so applicant tracking systems can parse and rank your resume accurately.",
            },
          },
          {
            "@type": "Question",
            name: "Which file formats can I upload?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can upload a PDF or DOCX resume. CVJungle extracts the text, structures it, then runs role alignment, rewrites, LinkedIn suggestions, and PDF export.",
            },
          },
          {
            "@type": "Question",
            name: "Is CVJungle free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes during the MVP. Upload, role alignment, truthful rewrites, LinkedIn copy, and ATS PDF export are free, with fair-use rate limits to protect capacity.",
            },
          },
        ],
      },
    ],
  };
}
