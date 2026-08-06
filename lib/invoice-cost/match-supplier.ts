import { normalizeText } from "@/lib/searchEngine";

export interface SupplierMatchOption {
  id: string;
  name: string;
}

const LEGAL_SUFFIXES = new Set([
  "sas",
  "sa",
  "ltda",
  "llc",
  "inc",
  "cia",
  "co",
]);

function significantTokens(normalized: string): string[] {
  return normalized
    .split(" ")
    .filter(Boolean)
    .filter((t) => t.length > 1 && !LEGAL_SUFFIXES.has(t));
}

/**
 * Resuelve supplier_id por similitud de nombre (factura → catálogo).
 */
export function matchSupplierByName(
  invoiceSupplierName: string | null | undefined,
  suppliers: SupplierMatchOption[],
): SupplierMatchOption | null {
  const needle = normalizeText(invoiceSupplierName ?? "");
  if (!needle || suppliers.length === 0) return null;

  const needleTokens = significantTokens(needle);
  if (needleTokens.length === 0) return null;

  let best: { supplier: SupplierMatchOption; score: number } | null = null;

  for (const supplier of suppliers) {
    const hay = normalizeText(supplier.name);
    if (!hay) continue;

    let score = 0;
    if (hay === needle) {
      score = 1;
    } else if (hay.includes(needle) || needle.includes(hay)) {
      score = 0.85;
    } else {
      const hayTokens = significantTokens(hay);
      if (hayTokens.length === 0) continue;
      const haySet = new Set(hayTokens);
      let hits = 0;
      for (const t of needleTokens) {
        if (haySet.has(t)) hits += 1;
      }
      score = hits / Math.max(needleTokens.length, hayTokens.length);
      // Bonus si todos los tokens significativos de la factura están en el catálogo
      if (hits === needleTokens.length && hits >= 2) {
        score = Math.max(score, 0.8);
      }
    }

    if (score < 0.45) continue;
    if (!best || score > best.score) best = { supplier, score };
  }

  return best?.supplier ?? null;
}
