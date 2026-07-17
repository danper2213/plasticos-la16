import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { PUBLIC_PRODUCTS_TABLE } from "@/lib/public-products-table";

type SitemapProductRow = {
  slug: string;
  updated_at: string | null;
};

function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function parseLastModified(value: string | null | undefined, fallback: Date): Date {
  if (!value?.trim()) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_PRODUCTS_TABLE)
    .select("slug, updated_at")
    .not("slug", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("sitemap products:", error);
  }

  const products = ((data ?? []) as unknown as SitemapProductRow[]).filter((row) =>
    Boolean(row.slug?.trim()),
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
    const slug = product.slug.trim();
    return {
      url: `${baseUrl}/productos/${slug}`,
      lastModified: parseLastModified(product.updated_at, now),
      changeFrequency: "weekly",
      priority: 0.8,
    };
  });

  return [...staticRoutes, ...productRoutes];
}
