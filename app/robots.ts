import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexableSite } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const indexable = isIndexableSite();

  if (!indexable) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: siteUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
