import type { MetadataRoute } from "next";
import { getPublicCategories } from "@/lib/public-categories";
import { PUBLIC_PRODUCTS_TABLE } from "@/lib/public-products-table";
import { getSiteUrl } from "@/lib/public-seo";
import { createClient } from "@/utils/supabase/server";

type SitemapProductRow = {
  slug: string;
  updated_at: string | null;
  image_url: string | null;
};

function parseLastModified(value: string | null | undefined, fallback: Date): Date {
  if (!value?.trim()) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const supabase = await createClient();
  const [{ data, error }, categories] = await Promise.all([
    supabase
    .from(PUBLIC_PRODUCTS_TABLE)
    .select("slug, updated_at, image_url")
    .not("slug", "is", null)
    .order("updated_at", { ascending: false }),
    getPublicCategories(),
  ]);

  if (error) {
    console.error("sitemap products:", error);
  }

  const products = ((data ?? []) as unknown as SitemapProductRow[]).filter(
    (row) => Boolean(row.slug?.trim()) && Boolean(row.image_url?.trim()),
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
    ...categories.map((category) => ({
      url: `${baseUrl}/productos/categoria/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
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
