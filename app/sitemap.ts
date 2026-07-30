import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexableSite } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexableSite()) return [];

  const siteUrl = getSiteUrl();
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/optimize`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
