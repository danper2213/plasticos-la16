import { createClient } from "@/utils/supabase/server";
import { categoryToSlug } from "@/lib/public-seo";

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("getPublicCategories:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as { id: string; name: string }[];
  const used = new Set<string>();

  return rows.flatMap((row) => {
    const name = row.name?.trim();
    if (!name) return [];
    let slug = categoryToSlug(name);
    if (!slug) return [];
    if (used.has(slug)) slug = `${slug}-${row.id.slice(0, 8)}`;
    used.add(slug);
    return [{ id: row.id, name, slug }];
  });
}

export async function getPublicCategoryBySlug(slug: string): Promise<PublicCategory | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const categories = await getPublicCategories();
  return categories.find((category) => category.slug === normalized) ?? null;
}
