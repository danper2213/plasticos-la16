import type { ExtractedSheetLine } from "@/lib/inventory-sheet/extract-sheet-shared";

const DITTO_CHARS = /[\"“”„‟″〃'’`¨]/g;
const LEADING_QTY_RE = /^\d+(?:[.,]\d+)?\s*[-–—.]\s+/;
const COLOR_WORDS = new Set([
  "blanco",
  "blanca",
  "negra",
  "negro",
  "transparente",
  "cristal",
  "natural",
  "rojo",
  "roja",
  "verde",
  "azul",
]);
const UNIT_WORDS = new Set([
  "oz",
  "onza",
  "onzas",
  "ml",
  "cc",
  "und",
  "unidad",
  "unidades",
]);

function firstFamilyToken(descripcion: string): string | null {
  for (const raw of descripcion.trim().split(/\s+/)) {
    const letters = raw.replace(/[^\p{L}]/gu, "");
    if (letters.length < 3) continue;
    const lower = letters.toLowerCase();
    if (COLOR_WORDS.has(lower) || UNIT_WORDS.has(lower)) continue;
    return letters;
  }
  return null;
}

function stripDittoMarks(value: string): string {
  return value.replace(DITTO_CHARS, " ").replace(/\s+/g, " ").trim();
}

function isMostlyDitto(value: string): boolean {
  const stripped = stripDittoMarks(value);
  return stripped.length === 0;
}

function looksLikeContinuation(descripcion: string): boolean {
  const cleaned = stripDittoMarks(descripcion);
  if (!cleaned) return true;
  return firstFamilyToken(cleaned) == null;
}

function stripLeadingQuantityPrefix(descripcion: string): string {
  const next = descripcion.replace(LEADING_QTY_RE, "").trim();
  return next || descripcion.trim();
}

/**
 * Limpia listas manuscritas: quita `2 - ` del nombre, expande comillas/ditto
 * y completa filas que solo traen talle/color heredando el producto anterior.
 */
export function normalizeHandwrittenSheetLines(
  lines: ExtractedSheetLine[],
): ExtractedSheetLine[] {
  const sorted = [...lines].sort((a, b) => a.rowIndex - b.rowIndex);
  let previousFamily: string | null = null;
  let previousFull: string | null = null;

  return sorted.map((line) => {
    let descripcion = stripLeadingQuantityPrefix(line.descripcion ?? "");
    const dittoOnly = isMostlyDitto(descripcion);
    const continuation = looksLikeContinuation(descripcion);

    if (dittoOnly && previousFull) {
      descripcion = previousFull;
    } else if (continuation && previousFamily) {
      const rest = stripDittoMarks(descripcion);
      descripcion = rest ? `${previousFamily} ${rest}` : previousFamily;
    } else {
      descripcion = stripDittoMarks(descripcion) || descripcion;
    }

    descripcion = descripcion.replace(/,(?=\S)/g, ", ").replace(/\s+/g, " ").trim();
    previousFull = descripcion || previousFull;
    previousFamily = firstFamilyToken(descripcion) ?? previousFamily;

    return { ...line, descripcion: descripcion || line.descripcion };
  });
}
