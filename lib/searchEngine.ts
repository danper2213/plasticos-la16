/**
 * Motor de búsqueda cliente estilo marketplace para Lista de Precios.
 * Sin dependencias externas: normalización, tokenización y scoring en TypeScript puro.
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  presentation?: string | null;
  packaging?: string | null;
  price: number;
}

export const STOP_WORDS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "e",
  "el",
  "en",
  "la",
  "las",
  "lo",
  "los",
  "o",
  "para",
  "por",
  "un",
  "una",
  "unas",
  "unos",
  "y",
]);

const MEASURE_UNITS =
  "oz|ml|cc|lb|kg|g|lt|l|und|unidad|unidades|u|onza|onzas|gramo|gramos|litro|litros";

/** Une número + unidad: "12 oz" → "12oz", "500 cc" → "500cc" */
const MEASURE_JOIN_RE = new RegExp(
  `(\\d+(?:[.,]\\d+)?)\\s*(${MEASURE_UNITS})\\b`,
  "gi",
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNumericToken(token: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(token);
}

export type SearchHighlightSegment = {
  value: string;
  highlight: boolean;
};

function mergeHighlightRanges(
  ranges: { start: number; end: number }[],
): { start: number; end: number }[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/** Segmentos de texto para resaltar coincidencias de búsqueda en la UI. */
export function getSearchHighlightSegments(
  text: string,
  query: string,
): SearchHighlightSegment[] {
  if (!text) return [{ value: "", highlight: false }];

  const tokens = tokenize(query);
  if (tokens.length === 0) return [{ value: text, highlight: false }];

  const ranges: { start: number; end: number }[] = [];
  const lowerText = text.toLowerCase();

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    if (isNumericToken(token)) {
      const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
        });
      }
      continue;
    }

    let index = 0;
    while ((index = lowerText.indexOf(lowerToken, index)) !== -1) {
      ranges.push({ start: index, end: index + token.length });
      index += token.length || 1;
    }
  }

  const merged = mergeHighlightRanges(ranges);
  if (merged.length === 0) return [{ value: text, highlight: false }];

  const segments: SearchHighlightSegment[] = [];
  let cursor = 0;

  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({
        value: text.slice(cursor, range.start),
        highlight: false,
      });
    }
    segments.push({
      value: text.slice(range.start, range.end),
      highlight: true,
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor), highlight: false });
  }

  return segments;
}

/**
 * Minúsculas, sin tildes, puntuación como espacio y medidas compactadas (12oz, 1.5kg).
 * Preserva decimales (1.5) antes de eliminar puntuación.
 */
export function normalizeText(value: string): string {
  let base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d),(\d)/g, "$1.$2");

  // Unir medida antes de quitar puntuación: "1.5 kg" → "1.5kg"
  base = base.replace(MEASURE_JOIN_RE, (_, num: string, unit: string) => {
    const normalizedNum = num.replace(",", ".");
    return `${normalizedNum}${unit.toLowerCase()}`;
  });

  // Proteger decimales restantes (ej. "1.5" sin unidad pegada)
  base = base.replace(/(\d)\.(\d)/g, "$1§$2");
  base = base.replace(/[^\p{L}\p{N}§]+/gu, " ");
  base = base.replace(/§/g, ".");

  return base.replace(/\s+/g, " ").trim();
}

/**
 * Divide la consulta en tokens útiles (sin stop-words).
 */
/** Escapa comodines para filtros SQL `ILIKE`. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export function tokenize(query: string): string[] {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of normalized.split(" ")) {
    const token = raw.trim();
    if (!token || STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

const COMPACT_MEASURE_RE = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)(${MEASURE_UNITS})$`,
  "i",
);

/**
 * Variantes de un token para ILIKE en Supabase.
 * Ej.: "3oz" → ["3oz", "3 oz"] porque en BD suele guardarse con espacio.
 */
export function expandSearchTermVariants(term: string): string[] {
  const variants = new Set<string>([term]);
  const match = COMPACT_MEASURE_RE.exec(term);

  if (match) {
    const num = match[1].replace(",", ".");
    const unit = match[2].toLowerCase();
    variants.add(`${num}${unit}`);
    variants.add(`${num} ${unit}`);
  }

  return [...variants];
}

/**
 * Patrones ILIKE por término. Los números sueltos usan contexto (espacios/unidad)
 * para no confundir "7" con "17" o "70".
 */
export function getIlikePatternsForSearchTerm(term: string): string[] {
  const escaped = escapeIlikePattern(term);

  if (COMPACT_MEASURE_RE.test(term)) {
    const match = COMPACT_MEASURE_RE.exec(term);
    if (match) {
      const num = match[1].replace(",", ".");
      const unit = match[2].toLowerCase();
      return [`%${num}${unit}%`, `%${num} ${unit}%`];
    }
    return [`%${escaped}%`];
  }

  if (isNumericToken(term)) {
    const patterns = new Set([
      `% ${escaped} %`,
      `${escaped} %`,
      `% ${escaped}`,
      `%${escaped}%`,
    ]);

    for (const unit of ["oz", "ml", "cc", "lt", "l", "und", "kg", "g", "lb"]) {
      patterns.add(`% ${escaped} ${unit}%`);
      patterns.add(`% ${escaped}${unit}%`);
      patterns.add(`${escaped} ${unit}%`);
      patterns.add(`${escaped}${unit}%`);
    }

    return [...patterns];
  }

  return [`%${escaped}%`];
}

/** Grupos de términos: cada grupo es OR; entre grupos es AND (todos deben coincidir). */
export function getSearchTermGroupsForServer(query: string): string[][] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return [[trimmed]];
  }

  return tokens.map((token) => expandSearchTermVariants(token));
}

function getProductHaystacks(product: Product) {
  const name = normalizeText(product.name);
  const category = normalizeText(product.category);
  const sku = normalizeText(product.sku);
  const descriptive = normalizeText(
    [product.name, product.presentation, product.packaging].filter(Boolean).join(" "),
  );
  const full = normalizeText(
    [
      product.name,
      product.presentation,
      product.packaging,
      product.category,
      product.sku,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return { name, category, sku, descriptive, full };
}

function tokenMatchesHaystack(haystack: string, token: string): boolean {
  if (!haystack || !token) return false;

  if (isNumericToken(token)) {
    return new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`, "u").test(haystack);
  }

  if (token.length <= 2) {
    return new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`, "u").test(haystack);
  }

  return haystack.includes(token);
}

function countMatchedTokens(
  haystacks: ReturnType<typeof getProductHaystacks>,
  tokens: string[],
): { matched: number; missing: string[] } {
  const missing: string[] = [];

  for (const token of tokens) {
    const hit =
      tokenMatchesHaystack(haystacks.name, token) ||
      tokenMatchesHaystack(haystacks.descriptive, token) ||
      tokenMatchesHaystack(haystacks.category, token) ||
      tokenMatchesHaystack(haystacks.sku, token) ||
      tokenMatchesHaystack(haystacks.full, token) ||
      (token.length >= 2 && haystacks.sku.includes(token)) ||
      (token.length >= 2 && haystacks.name.includes(token));

    if (!hit) missing.push(token);
  }

  return { matched: tokens.length - missing.length, missing };
}

/**
 * Puntaje de relevancia. `null` = no cumple criterios mínimos (términos faltantes).
 */
export function calculateScore(
  product: Product,
  queryTokens: string[],
  normalizedQuery: string,
): number | null {
  if (queryTokens.length === 0 && !normalizedQuery) return 0;

  const haystacks = getProductHaystacks(product);

  if (normalizedQuery && haystacks.sku && haystacks.sku === normalizedQuery) {
    return 10_000;
  }

  for (const token of queryTokens) {
    if (haystacks.sku && haystacks.sku === token) {
      return 10_000;
    }
  }

  const { missing } = countMatchedTokens(haystacks, queryTokens);
  if (missing.length > 0) {
    return null;
  }

  let score = 0;

  if (normalizedQuery) {
    if (haystacks.name === normalizedQuery) score += 1_000;
    else if (haystacks.name.startsWith(normalizedQuery)) score += 500;
    else if (haystacks.name.includes(normalizedQuery)) score += 300;
    else if (haystacks.descriptive.includes(normalizedQuery)) score += 200;
    else if (haystacks.full.includes(normalizedQuery)) score += 120;
  }

  for (const token of queryTokens) {
    if (haystacks.name === token) score += 80;
    else if (haystacks.name.startsWith(token)) score += 45;
    else if (haystacks.name.split(" ").some((w) => w.startsWith(token))) score += 35;
    else if (haystacks.name.includes(token)) score += 25;
    else if (haystacks.descriptive.includes(token)) score += 18;
    else if (haystacks.category.includes(token)) score += 12;
    else if (haystacks.sku.includes(token)) score += 8;
  }

  if (queryTokens.length > 1) {
    let lastIndex = -1;
    let inOrder = true;
    for (const token of queryTokens) {
      const idx = haystacks.name.indexOf(token, lastIndex + 1);
      if (idx === -1) {
        inOrder = false;
        break;
      }
      lastIndex = idx;
    }
    if (inOrder) score += 60;
  }

  const missingPenalty = missing.length * 250;
  score -= missingPenalty;

  score -= haystacks.name.length * 0.05;

  return score;
}

export type ScoredProduct<T extends Product> = {
  product: T;
  score: number;
};

/**
 * Búsqueda inteligente: filtra por tokens obligatorios y ordena por relevancia.
 */
export function searchIntelligent<T extends Product>(
  query: string,
  products: T[],
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return products;

  const normalizedQuery = normalizeText(trimmed);
  const queryTokens = tokenize(trimmed);
  if (queryTokens.length === 0 && !normalizedQuery) return products;

  const scored: ScoredProduct<T>[] = [];

  for (const product of products) {
    const score = calculateScore(product, queryTokens, normalizedQuery);
    if (score === null) continue;
    scored.push({ product, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name, "es");
  });

  return scored.map((row) => row.product);
}

/** Adapta un producto del dashboard al contrato del motor. */
export function toSearchProduct(row: {
  id: string;
  name: string;
  scan_code?: string | null;
  category_name?: string | null;
  presentation?: string | null;
  packaging?: string | null;
  selling_price?: number;
  cost?: number;
}): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.scan_code ?? "",
    category: row.category_name ?? "",
    presentation: row.presentation ?? null,
    packaging: row.packaging ?? null,
    price: row.selling_price ?? row.cost ?? 0,
  };
}
