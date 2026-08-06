import {
  normalizeText,
  tokenize,
} from "@/lib/searchEngine";
import { stripPackNoise } from "@/lib/invoice-cost/strip-pack-noise";

/** Producto mínimo para match por similitud. */
export interface InvoiceMatchProduct {
  id: string;
  name: string;
  /** Presentación / detalle (equivalente a descripción en catálogo). */
  presentation?: string | null;
  packaging?: string | null;
  cost: number;
  supplier_id?: string | null;
}

export interface ProductMatchCandidate {
  product: InvoiceMatchProduct;
  /** 0–1 */
  score: number;
  confidence: "high" | "medium" | "low";
}

export interface MatchProductsOptions {
  /** Máximo de candidatos a devolver (default 5). */
  limit?: number;
  /** Score mínimo para incluir (default 0.28). */
  minScore?: number;
  /** Preferir productos del mismo proveedor (+bonus). */
  preferSupplierId?: string | null;
}

/**
 * Rankea productos por similitud de nombre + presentación/empaque
 * contra la descripción de la línea de factura.
 *
 * No exige que todos los tokens de la factura estén en el producto
 * (las facturas traen mucho texto extra).
 */
export function matchProductsBySimilarity(
  invoiceDescription: string,
  products: InvoiceMatchProduct[],
  options: MatchProductsOptions = {},
): ProductMatchCandidate[] {
  const limit = options.limit ?? 5;
  const minScore = options.minScore ?? 0.28;
  const preferSupplierId = options.preferSupplierId ?? null;

  const queryText = stripPackNoise(invoiceDescription);
  const queryNorm = normalizeText(queryText);
  const queryTokens = tokenize(queryText);

  if (!queryNorm || products.length === 0) return [];

  const scored: ProductMatchCandidate[] = [];

  for (const product of products) {
    const nameNorm = normalizeText(product.name);
    const descNorm = normalizeText(
      [product.presentation, product.packaging].filter(Boolean).join(" "),
    );
    const fullNorm = normalizeText(
      [product.name, product.presentation, product.packaging]
        .filter(Boolean)
        .join(" "),
    );
    const productTokens = new Set(tokenize(fullNorm));

    if (!nameNorm && !fullNorm) continue;

    let score = similarityScore({
      queryNorm,
      queryTokens,
      nameNorm,
      descNorm,
      fullNorm,
      productTokens,
    });

    if (
      preferSupplierId &&
      product.supplier_id &&
      product.supplier_id === preferSupplierId
    ) {
      score = Math.min(1, score + 0.06);
    }

    if (score < minScore) continue;

    scored.push({
      product,
      score: round3(score),
      confidence: toConfidence(score),
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name, "es");
  });

  return scored.slice(0, limit);
}

function similarityScore(args: {
  queryNorm: string;
  queryTokens: string[];
  nameNorm: string;
  descNorm: string;
  fullNorm: string;
  productTokens: Set<string>;
}): number {
  const {
    queryNorm,
    queryTokens,
    nameNorm,
    descNorm,
    fullNorm,
    productTokens,
  } = args;

  if (nameNorm && nameNorm === queryNorm) return 1;
  if (fullNorm && fullNorm === queryNorm) return 0.98;

  // Contención fuerte
  if (nameNorm && (queryNorm.includes(nameNorm) || nameNorm.includes(queryNorm))) {
    const lenRatio =
      Math.min(nameNorm.length, queryNorm.length) /
      Math.max(nameNorm.length, queryNorm.length);
    return clamp01(0.72 + lenRatio * 0.2);
  }

  if (queryTokens.length === 0) {
    if (fullNorm.includes(queryNorm) || queryNorm.includes(fullNorm)) {
      return 0.55;
    }
    return 0;
  }

  let nameHits = 0;
  let descHits = 0;
  let fullHits = 0;

  for (const token of queryTokens) {
    if (tokenIn(nameNorm, token)) nameHits += 1;
    else if (tokenIn(descNorm, token)) descHits += 1;
    else if (tokenIn(fullNorm, token) || productTokens.has(token)) fullHits += 1;
  }

  const weightedHits = nameHits * 1.0 + descHits * 0.65 + fullHits * 0.4;
  const coverage = weightedHits / queryTokens.length;

  // Jaccard sobre tokens de nombre+desc
  const querySet = new Set(queryTokens);
  let intersection = 0;
  for (const t of querySet) {
    if (productTokens.has(t) || tokenIn(fullNorm, t)) intersection += 1;
  }
  const union = new Set([...querySet, ...productTokens]).size || 1;
  const jaccard = intersection / union;

  // Medidas (16oz, 400ml) pesan más
  let measureBonus = 0;
  for (const token of queryTokens) {
    if (/\d/.test(token) && tokenIn(fullNorm, token)) {
      measureBonus += 0.08;
    }
  }

  const nameTokenCount = tokenize(nameNorm).length || 1;
  const nameCoverage = nameHits / nameTokenCount;

  return clamp01(
    coverage * 0.45 + jaccard * 0.25 + nameCoverage * 0.25 + measureBonus,
  );
}

function tokenIn(haystack: string, token: string): boolean {
  if (!haystack || !token) return false;
  if (haystack === token) return true;
  if (haystack.startsWith(`${token} `) || haystack.endsWith(` ${token}`)) {
    return true;
  }
  return haystack.includes(` ${token} `) || haystack.includes(token);
}

function toConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 0.72) return "high";
  if (score >= 0.48) return "medium";
  return "low";
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
