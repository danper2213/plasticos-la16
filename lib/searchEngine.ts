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
  "oz|ml|cc|lb|kg|g|lt|l|und|unidad|unidades|u|onza|onzas|gramo|gramos|litro|litros|metro|metros|mts|mt|cm|mm|m";

/** Une número + unidad: "12 oz" → "12oz", "300 m" → "300m" */
const MEASURE_JOIN_RE = new RegExp(
  `(\\d+(?:[.,]\\d+)?)\\s*(${MEASURE_UNITS})\\b`,
  "gi",
);

/** Une "x 300 m" / "x300 m" / "x 300m" → "x300m" */
const X_MEASURE_JOIN_RE = new RegExp(
  `\\bx\\s*(\\d+(?:[.,]\\d+)?)\\s*(${MEASURE_UNITS})\\b`,
  "gi",
);

/** Une "x 300" → "x300" cuando no hay unidad. */
const X_NUMBER_JOIN_RE = /\bx\s+(\d+(?:[.,]\d+)?)\b/g;

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
    for (const variant of expandSearchTermVariants(token)) {
      if (isNumericToken(variant)) {
        const re = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "gi");
        let match: RegExpExecArray | null;
        while ((match = re.exec(text)) !== null) {
          ranges.push({
            start: match.index,
            end: match.index + match[0].length,
          });
        }
        continue;
      }

      const lowerVariant = variant.toLowerCase();
      let index = 0;
      while ((index = lowerText.indexOf(lowerVariant, index)) !== -1) {
        ranges.push({ start: index, end: index + variant.length });
        index += variant.length || 1;
      }
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

function compactNumberUnit(num: string, unit: string): string {
  return `${num.replace(",", ".")}${unit.toLowerCase()}`;
}

function joinMeasures(value: string): string {
  let next = value.replace(
    X_MEASURE_JOIN_RE,
    (_: string, num: string, unit: string) => `x${compactNumberUnit(num, unit)}`,
  );
  next = next.replace(MEASURE_JOIN_RE, (_: string, num: string, unit: string) =>
    compactNumberUnit(num, unit),
  );
  next = next.replace(X_NUMBER_JOIN_RE, "x$1");
  return next;
}

/**
 * Minúsculas, sin tildes, puntuación como espacio y medidas compactadas (12oz, x300m).
 * Preserva decimales (1.5) antes de eliminar puntuación.
 */
export function normalizeText(value: string): string {
  let base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .replace(/(\d),(\d)/g, "$1.$2");

  // Unir medida antes de quitar puntuación: "1.5 kg" → "1.5kg", "x 300 m" → "x300m"
  base = joinMeasures(base);

  // Proteger decimales restantes (ej. "1.5" sin unidad pegada)
  base = base.replace(/(\d)\.(\d)/g, "$1§$2");
  base = base.replace(/[^\p{L}\p{N}§]+/gu, " ");
  base = base.replace(/§/g, ".");
  base = base.replace(/\s+/g, " ").trim();

  // Segunda pasada por si la puntuación dejó "x 300 m" o "300-m"
  base = joinMeasures(base);

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

const COMPACT_X_MEASURE_RE = new RegExp(
  `^x(\\d+(?:[.,]\\d+)?)(${MEASURE_UNITS})$`,
  "i",
);

const COMPACT_X_NUMBER_RE = /^x(\d+(?:[.,]\d+)?)$/i;

function spacedMeasureVariants(
  num: string,
  unit: string | null,
  prefixX: boolean,
): string[] {
  const n = num.replace(",", ".");
  const variants: string[] = [];

  if (prefixX && unit) {
    const u = unit.toLowerCase();
    variants.push(`x${n}${u}`, `x ${n} ${u}`, `x${n} ${u}`, `x ${n}${u}`);
  } else if (prefixX) {
    variants.push(`x${n}`, `x ${n}`);
  } else if (unit) {
    const u = unit.toLowerCase();
    variants.push(`${n}${u}`, `${n} ${u}`);
  }

  return variants;
}

/**
 * Variantes de un token para ILIKE en Supabase.
 * Ej.: "3oz" → ["3oz", "3 oz"]; "x300m" → ["x300m", "x 300 m", ...].
 */
export function expandSearchTermVariants(term: string): string[] {
  const variants = new Set<string>([term]);
  const xMeasure = COMPACT_X_MEASURE_RE.exec(term);
  if (xMeasure) {
    for (const variant of spacedMeasureVariants(xMeasure[1], xMeasure[2], true)) {
      variants.add(variant);
    }
    return [...variants];
  }

  const xNumber = COMPACT_X_NUMBER_RE.exec(term);
  if (xNumber) {
    for (const variant of spacedMeasureVariants(xNumber[1], null, true)) {
      variants.add(variant);
    }
    return [...variants];
  }

  const match = COMPACT_MEASURE_RE.exec(term);
  if (match) {
    for (const variant of spacedMeasureVariants(match[1], match[2], false)) {
      variants.add(variant);
    }
  }

  return [...variants];
}

/**
 * Patrones ILIKE por término. Los números sueltos usan contexto (espacios/unidad)
 * para no confundir "7" con "17" o "70".
 */
export function getIlikePatternsForSearchTerm(term: string): string[] {
  const escaped = escapeIlikePattern(term);

  const xMeasure = COMPACT_X_MEASURE_RE.exec(term);
  if (xMeasure) {
    return spacedMeasureVariants(xMeasure[1], xMeasure[2], true).map(
      (variant) => `%${escapeIlikePattern(variant)}%`,
    );
  }

  if (COMPACT_X_NUMBER_RE.test(term)) {
    const match = COMPACT_X_NUMBER_RE.exec(term);
    if (match) {
      return spacedMeasureVariants(match[1], null, true).map(
        (variant) => `%${escapeIlikePattern(variant)}%`,
      );
    }
  }

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

    for (const unit of [
      "oz",
      "ml",
      "cc",
      "lt",
      "l",
      "und",
      "kg",
      "g",
      "lb",
      "m",
      "mt",
      "mts",
      "cm",
      "mm",
    ]) {
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
    // "8" coincide con "8" y con la medida compactada "8oz", no con "18" ni "80".
    return new RegExp(
      `(^|\\s|x)${escapeRegExp(token)}(?:${MEASURE_UNITS})?($|\\s)`,
      "u",
    ).test(haystack);
  }

  if (token.length <= 2) {
    return new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`, "u").test(haystack);
  }

  return haystack.includes(token);
}

/** Texto unificado normalizado para comparar contra una consulta. */
export function buildSearchHaystack(
  ...parts: (string | null | undefined)[]
): string {
  return normalizeText(parts.filter(Boolean).join(" "));
}

/**
 * ¿Coincide un conjunto de campos con la consulta? Misma lógica AND por tokens que productos.
 */
export function matchesSearchQuery(
  query: string,
  ...parts: (string | null | undefined)[]
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const haystack = buildSearchHaystack(...parts);
  if (!haystack) return false;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    const normalizedQuery = normalizeText(trimmed);
    return normalizedQuery ? haystack.includes(normalizedQuery) : true;
  }

  return tokens.every((token) => tokenMatchesHaystack(haystack, token));
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
