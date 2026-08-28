const FILLER_PREFIX_RE =
  /^(búscame|buscame|busca(?:r|me)?|mostrame|mostrame|quiero|necesito|dame|encontrame|encuentra)\s+/i;
const ARTICLE_PREFIX_RE = /^(el|la|los|las|un|una)\s+/i;
const FILLER_SUFFIX_RE = /\s*(por\s+favor|porfa)$/i;

export type VoiceProductIntent = "search" | "price" | "stock";

export type VoiceProductRequest = {
  intent: VoiceProductIntent;
  query: string;
};

const PRICE_PREFIX_RE =
  /^(?:a\s+)?(?:cuanto|como)\s+(?:sale|vale|cuesta|es|esta)\s+(?:el|la|los|las|un|una)?\s*|^(?:el\s+)?precio\s+(?:de\s+(?:el|la|los|las)?)?\s*|^a\s+como\s+(?:esta|sale|vale)\s+(?:el|la|los|las|un|una)?\s*/;

const STOCK_PREFIX_RE =
  /^cuanto\s+hay\s+(?:de\s+)?(?:el|la|los|las)?\s*|^hay\s+stock\s+(?:de\s+)?(?:el|la|los|las)?\s*|^hay\s+en\s+bodega\s+(?:de\s+)?(?:el|la|los|las)?\s*|^hay\s+(?:existencia|existencias|disponible)\s+(?:de\s+)?(?:el|la|los|las)?\s*|^hay\s+de\s+(?:el|la|los|las)?\s*|^(?:tenemos|queda|quedan)\s+(?:stock\s+)?(?:de\s+)?(?:el|la|los|las)?\s*|^hay\s+/;

const NUMBER_WORDS: Record<string, string> = {
  medio: "0.5",
  una: "1",
  uno: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
  diez: "10",
  once: "11",
  doce: "12",
  trece: "13",
  catorce: "14",
  quince: "15",
  dieciseis: "16",
  dieciséis: "16",
  diecisiete: "17",
  dieciocho: "18",
  diecinueve: "19",
  veinte: "20",
  veintiuno: "21",
  veintidos: "22",
  veintidós: "22",
  veinticuatro: "24",
  treinta: "30",
  treintaicinco: "35",
};

const UNIT_WORDS: Record<string, string> = {
  onza: "oz",
  onzas: "oz",
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function replaceNumberAndUnitWords(value: string): string {
  return value
    .split(/\s+/)
    .map((token) => {
      const cleaned = token.replace(/[.,;:¡!¿?]+$/g, "");
      const key = fold(cleaned);
      if (NUMBER_WORDS[key]) return NUMBER_WORDS[key];
      if (UNIT_WORDS[key]) return UNIT_WORDS[key];
      return token;
    })
    .join(" ");
}

function joinSpokenDecimals(value: string): string {
  return value.replace(/\b([a-záéíóúñ]+|\d+)\s+y\s+medio\b/gi, (_, raw: string) => {
    const mapped = NUMBER_WORDS[fold(raw)] ?? raw;
    const n = Number(String(mapped).replace(",", "."));
    if (!Number.isFinite(n)) return `${raw} y medio`;
    return String(n + 0.5);
  }).replace(/\b(\d+)\s+punto\s+(\d+)\b/gi, "$1.$2");
}

function stripFillers(value: string): string {
  let next = value.trim();
  for (let i = 0; i < 4; i += 1) {
    const stripped = next.replace(FILLER_PREFIX_RE, "").trim();
    if (stripped === next) break;
    next = stripped;
  }
  next = next.replace(ARTICLE_PREFIX_RE, "").trim();
  next = next.replace(FILLER_SUFFIX_RE, "").trim();
  return next;
}

/** Convierte un dictado en consulta de productos (números, oz, muletillas). */
export function normalizeVoiceQuery(raw: string): string {
  let text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  text = stripFillers(text);
  text = joinSpokenDecimals(text);
  text = replaceNumberAndUnitWords(text);
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*onzas?\b/gi, "$1 oz");
  text = stripFillers(text);
  return text.replace(/\s+/g, " ").trim();
}

function stripQuestionPunctuation(value: string): string {
  return value.replace(/[¿?¡!.,;:]+/g, " ").replace(/\s+/g, " ").trim();
}

function stripPrefix(value: string, pattern: RegExp): string {
  const match = value.match(pattern);
  if (!match?.[0]) return value;
  return value.slice(match[0].length).trim();
}

/**
 * Detecta si el dictado pregunta precio o stock y deja solo el nombre del producto.
 */
export function parseVoiceProductRequest(raw: string): VoiceProductRequest {
  const cleaned = stripQuestionPunctuation((raw ?? "").replace(/\s+/g, " ").trim());
  if (!cleaned) return { intent: "search", query: "" };

  const folded = fold(cleaned);
  let intent: VoiceProductIntent = "search";
  let remainder = folded;

  if (PRICE_PREFIX_RE.test(folded)) {
    intent = "price";
    remainder = stripPrefix(folded, PRICE_PREFIX_RE);
  } else if (STOCK_PREFIX_RE.test(folded)) {
    intent = "stock";
    remainder = stripPrefix(folded, STOCK_PREFIX_RE);
  }

  return { intent, query: normalizeVoiceQuery(remainder) };
}
