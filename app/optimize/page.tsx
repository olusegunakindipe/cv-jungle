import type { Metadata } from "next";
import { CvOptimizerApp } from "@/components/cv-optimizer-app";
import { isIndexableSite } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Optimize your CV & LinkedIn",
  description:
    "Upload your resume, improve it for a target role without inventing skills, generate LinkedIn headline and About copy, and download an ATS-friendly PDF — free.",
  alternates: {
    canonical: "/optimize",
  },
  robots: isIndexableSite()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function OptimizePage() {
  return <CvOptimizerApp />;
}
