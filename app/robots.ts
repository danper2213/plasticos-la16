import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/public-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login", "/kiosco"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
