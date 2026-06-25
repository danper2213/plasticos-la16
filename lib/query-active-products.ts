import type { SupabaseClient } from "@supabase/supabase-js";
import {
  searchIntelligent,
  toSearchProduct,
  type Product,
} from "@/lib/searchEngine";
import {
  applySupabaseSearchFilter,
  type SearchFieldResolver,
} from "@/lib/supabase-search-filter";

export type QueryActiveProductsConfig<T extends { id: string }> = {
  select: string;
  limit: number;
  resolveFields: SearchFieldResolver;
  mapRow: (row: Record<string, unknown>) => T;
  toRankProduct?: (item: T, row: Record<string, unknown>) => Product;
};

export async function queryActiveProductsWithSearch<T extends { id: string }>(
  supabase: SupabaseClient,
  query: string,
  config: QueryActiveProductsConfig<T>,
): Promise<T[]> {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 2) return [];

  let q = supabase.from("products").select(config.select).eq("is_active", true);
  q = applySupabaseSearchFilter(q, trimmed, config.resolveFields);

  const { data, error } = await q;
  if (error) {
    console.error("queryActiveProductsWithSearch error:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const items = rows.map(config.mapRow);
  const rankInput = items.map((item, index) => {
    const row = rows[index];
    if (config.toRankProduct) {
      return config.toRankProduct(item, row);
    }
    const cat = row.product_categories as
      | { name?: string }
      | { name?: string }[]
      | null
      | undefined;
    const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
    return toSearchProduct({
      id: item.id,
      name: (row.name as string) ?? "",
      scan_code: (row.scan_code as string | null) ?? "",
      category_name: categoryName ?? null,
      presentation: (row.presentation as string | null) ?? null,
      packaging: (row.packaging as string | null) ?? null,
      cost: Number(row.cost ?? 0),
    });
  });

  const ranked = searchIntelligent(trimmed, rankInput);
  const order = new Map(ranked.map((product, index) => [product.id, index]));
  const sorted = [...items].sort(
    (a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999),
  );

  return sorted.slice(0, config.limit);
}
