/**
 * Normaliza texto para búsqueda: minúsculas, sin acentos, puntuación como espacio.
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "a",
  "en",
  "con",
  "para",
  "por",
  "un",
  "una",
  "unos",
  "unas",
]);

const MEASURE_UNITS =
  "oz|ml|lb|kg|g|lt|l|und|unidad|unidades|u|onza|onzas|gramo|gramos|litro|litros";

/** Frases de medida/cantidad: "16 oz", "500 ml", "12" */
const MEASURE_PHRASE_RE = new RegExp(
  `\\d+(?:[.,]\\d+)?\\s*(?:${MEASURE_UNITS})?`,
  "gi"
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNumericToken(token: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(token);
}

function isUnitToken(token: string): boolean {
  return new RegExp(`^(?:${MEASURE_UNITS})$`, "i").test(token);
}

export type ParsedProductQuery = {
  /** Palabras sueltas (sin stopwords ni partes ya cubiertas por frases). */
  tokens: string[];
  /** Frases que deben aparecer tal cual: "16 oz", "12 oz", etc. */
  phrases: string[];
};

export function parseProductSearchQuery(query: string): ParsedProductQuery {
  const normalized = normalizeSearchText(query);
  if (!normalized) return { tokens: [], phrases: [] };

  const phrases: string[] = [];
  const phraseSpans: { start: number; end: number }[] = [];

  for (const match of normalized.matchAll(MEASURE_PHRASE_RE)) {
    const raw = match[0]?.trim();
    if (!raw) continue;
    const phrase = normalizeSearchText(raw);
    if (!phrase) continue;
    phrases.push(phrase);
    phraseSpans.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }

  let remainder = normalized;
  for (const span of [...phraseSpans].sort((a, b) => b.start - a.start)) {
    remainder =
      remainder.slice(0, span.start).trim() +
      " " +
      remainder.slice(span.end).trim();
  }

  const tokens = remainder
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t) && !isUnitToken(t));

  const uniquePhrases = [...new Set(phrases)];

  return { tokens, phrases: uniquePhrases };
}

/** Divide la consulta en palabras (compatibilidad). */
export function tokenizeSearchQuery(query: string): string[] {
  const { tokens, phrases } = parseProductSearchQuery(query);
  return [...phrases.flatMap((p) => p.split(" ")), ...tokens].filter(Boolean);
}

export type ProductSearchFields = {
  name: string;
  presentation?: string | null;
  packaging?: string | null;
  scan_code?: string | null;
  category_name?: string | null;
  supplier_name?: string | null;
};

function getDescriptiveText(product: ProductSearchFields): string {
  return normalizeSearchText(
    [product.name, product.presentation, product.packaging].filter(Boolean).join(" ")
  );
}

function getFullHaystack(product: ProductSearchFields): string {
  return normalizeSearchText(
    [
      product.name,
      product.presentation,
      product.packaging,
      product.scan_code,
      product.category_name,
      product.supplier_name,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/** Palabra completa (evita que "16" coincida con "160" o códigos raros). */
function tokenMatchesInText(text: string, token: string): boolean {
  if (!text || !token) return false;
  if (isNumericToken(token)) {
    const re = new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`, "u");
    return re.test(text);
  }
  if (token.length <= 2) {
    const re = new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`, "u");
    return re.test(text);
  }
  return text.includes(token);
}

function phraseMatchesInText(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  return text.includes(phrase);
}

function queryMatchesProduct(
  product: ProductSearchFields,
  parsed: ParsedProductQuery
): boolean {
  if (parsed.tokens.length === 0 && parsed.phrases.length === 0) return true;

  const descriptive = getDescriptiveText(product);
  const fullHaystack = getFullHaystack(product);

  for (const phrase of parsed.phrases) {
    if (!phraseMatchesInText(descriptive, phrase)) {
      return false;
    }
  }

  for (const token of parsed.tokens) {
    const inDescriptive = tokenMatchesInText(descriptive, token);
    const inFull =
      isNumericToken(token) || isUnitToken(token)
        ? inDescriptive
        : tokenMatchesInText(fullHaystack, token) || inDescriptive;

    if (!inFull) return false;
  }

  return true;
}

export function matchesProductSearch(
  product: ProductSearchFields,
  query: string
): boolean {
  return scoreProductSearch(product, query) !== null;
}

export function scoreProductSearch(
  product: ProductSearchFields,
  query: string
): number | null {
  const parsed = parseProductSearchQuery(query);
  if (parsed.tokens.length === 0 && parsed.phrases.length === 0) return 0;

  if (!queryMatchesProduct(product, parsed)) return null;

  const name = normalizeSearchText(product.name);
  const presentation = normalizeSearchText(product.presentation ?? "");
  const descriptive = getDescriptiveText(product);
  const fullHaystack = getFullHaystack(product);
  const fullQuery = normalizeSearchText(query);

  let score = 0;

  if (fullQuery && name === fullQuery) score += 1000;
  else if (fullQuery && name.startsWith(fullQuery)) score += 500;
  else if (fullQuery && name.includes(fullQuery)) score += 300;
  else if (fullQuery && descriptive.includes(fullQuery)) score += 200;
  else if (fullQuery && fullHaystack.includes(fullQuery)) score += 120;

  for (const phrase of parsed.phrases) {
    if (name.includes(phrase)) score += 200;
    else if (presentation.includes(phrase)) score += 120;
    else if (descriptive.includes(phrase)) score += 80;
  }

  for (const token of parsed.tokens) {
    if (name === token) score += 80;
    else if (name.startsWith(token)) score += 45;
    else if (name.split(" ").some((word) => word.startsWith(token))) score += 35;
    else if (name.includes(token)) score += 25;
    else if (presentation.includes(token)) score += 15;
    else if (normalizeSearchText(product.category_name ?? "").includes(token)) score += 10;
  }

  if (parsed.phrases.length > 0 || parsed.tokens.length > 1) {
    const ordered = [...parsed.phrases, ...parsed.tokens];
    let lastIndex = -1;
    let inOrder = true;
    for (const part of ordered) {
      const idx = name.indexOf(part, lastIndex + 1);
      if (idx === -1) {
        inOrder = false;
        break;
      }
      lastIndex = idx;
    }
    if (inOrder) score += 60;
  }

  score -= name.length * 0.05;

  return score;
}

export function sortProductsBySearchRelevance<T extends ProductSearchFields>(
  products: T[],
  query: string
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return products;

  return [...products]
    .map((product) => ({
      product,
      score: scoreProductSearch(product, trimmed),
    }))
    .filter((row): row is { product: T; score: number } => row.score !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.product.name.localeCompare(b.product.name, "es");
    })
    .map((row) => row.product);
}
