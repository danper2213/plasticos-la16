import {
  getIlikePatternsForSearchTerm,
  getSearchTermGroupsForServer,
} from "@/lib/searchEngine";

export type SearchFieldResolver = (term: string) => readonly string[];

/** Lista de precios: nombre; códigos tipo j1 también en scan_code. */
export function productListSearchFields(term: string): readonly string[] {
  if (
    /^[a-z0-9-]{1,8}$/i.test(term) &&
    /\d/.test(term) &&
    /[a-z-]/i.test(term)
  ) {
    return ["name", "scan_code"];
  }
  return ["name"];
}

/** Autocompletado de productos: nombre, presentación, empaque y scan_code si aplica. */
export function productAutocompleteSearchFields(term: string): readonly string[] {
  if (
    /^[a-z0-9-]{1,8}$/i.test(term) &&
    /\d/.test(term) &&
    /[a-z-]/i.test(term)
  ) {
    return ["name", "presentation", "packaging", "scan_code"];
  }
  return ["name", "presentation", "packaging"];
}

type SupabaseSearchQueryable = {
  or: (filters: string) => SupabaseSearchQueryable;
  ilike: (column: string, pattern: string) => SupabaseSearchQueryable;
};

/** Filtro Supabase tokenizado: OR por variante/campo, AND entre tokens. */
export function applySupabaseSearchFilter<T extends SupabaseSearchQueryable>(
  query: T,
  search: string,
  resolveFields: SearchFieldResolver,
): T {
  let q = query;
  const termGroups = getSearchTermGroupsForServer(search);

  for (const variants of termGroups) {
    const orParts: string[] = [];

    for (const variant of variants) {
      const patterns = getIlikePatternsForSearchTerm(variant);
      const fields = resolveFields(variant);

      for (const pattern of patterns) {
        for (const field of fields) {
          orParts.push(`${field}.ilike.${pattern}`);
        }
      }
    }

    if (orParts.length === 0) continue;

    if (orParts.length === 1) {
      const [filter] = orParts;
      const match = /^(\w+)\.ilike\.(.+)$/.exec(filter);
      if (match) {
        q = q.ilike(match[1], match[2]) as T;
        continue;
      }
    }

    q = q.or(orParts.join(",")) as T;
  }

  return q;
}
