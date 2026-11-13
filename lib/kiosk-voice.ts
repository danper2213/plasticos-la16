import { normalizeVoiceQuery } from "@/lib/products-voice-query";
import { formatPesosForSpeech, softenTextForSpeech } from "@/lib/speech-voice";

export type KioskVoiceCandidate = {
  id: string;
  name: string;
  supplier_name: string;
  presentation?: string | null;
  packaging?: string | null;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function optionLabel(product: KioskVoiceCandidate, index: number): string {
  const parts = [
    product.name.trim(),
    product.supplier_name && product.supplier_name !== "—"
      ? `de ${product.supplier_name.trim()}`
      : null,
    product.presentation?.trim() || null,
    product.packaging?.trim() || null,
  ].filter(Boolean);
  return `Opción ${index + 1}: ${parts.join(", ")}`;
}

/** Pregunta al cliente cuál producto es cuando hay varios parecidos. */
export function buildKioskDisambiguationPrompt(
  candidates: KioskVoiceCandidate[],
): string {
  if (candidates.length === 0) return "No encontré productos.";
  if (candidates.length === 1) {
    return `Encontré ${candidates[0]!.name}.`;
  }

  const listed = candidates
    .slice(0, 5)
    .map((product, index) => optionLabel(product, index))
    .join(". ");

  return `Encontré ${candidates.length} productos parecidos. Decime el número de la opción, o el proveedor. ${listed}. ¿Cuál te sirve?`;
}

export function buildKioskPriceSpeech(
  name: string,
  pricePesos: number | null,
): string {
  const clean = softenTextForSpeech(name.trim() || "Producto");
  if (pricePesos == null || !(pricePesos > 0)) {
    return `${clean}. Por favor, consulta el precio en caja.`;
  }
  return `El precio de ${clean} es de ${formatPesosForSpeech(pricePesos)}.`;
}

const ORDINAL_WORDS: Record<string, number> = {
  uno: 1,
  una: 1,
  primero: 1,
  primera: 1,
  "opcion 1": 1,
  "opcion uno": 1,
  "numero 1": 1,
  "numero uno": 1,
  dos: 2,
  segundo: 2,
  segunda: 2,
  "opcion 2": 2,
  "opcion dos": 2,
  "numero 2": 2,
  "numero dos": 2,
  tres: 3,
  tercero: 3,
  tercera: 3,
  "opcion 3": 3,
  "opcion tres": 3,
  "numero 3": 3,
  "numero tres": 3,
  cuatro: 4,
  cuarto: 4,
  cuarta: 4,
  "opcion 4": 4,
  "opcion cuatro": 4,
  cinco: 5,
  quinto: 5,
  quinta: 5,
  "opcion 5": 5,
  "opcion cinco": 5,
};

/**
 * Resuelve la opción elegida por voz (número, "opción N", proveedor o fragmento del nombre).
 */
export function resolveKioskVoiceChoice(
  transcript: string,
  candidates: KioskVoiceCandidate[],
): KioskVoiceCandidate | null {
  if (candidates.length === 0) return null;
  const raw = normalizeVoiceQuery(transcript);
  const text = fold(raw);
  if (!text) return null;

  const digit = text.match(/\b(?:opcion|numero|nro|n)\s*(\d)\b/);
  if (digit) {
    const n = Number(digit[1]);
    if (n >= 1 && n <= candidates.length) return candidates[n - 1] ?? null;
  }

  const loneDigit = text.match(/^\s*(\d)\s*$/);
  if (loneDigit) {
    const n = Number(loneDigit[1]);
    if (n >= 1 && n <= candidates.length) return candidates[n - 1] ?? null;
  }

  for (const [phrase, n] of Object.entries(ORDINAL_WORDS)) {
    if (text.includes(fold(phrase)) && n >= 1 && n <= candidates.length) {
      return candidates[n - 1] ?? null;
    }
  }

  let best: { product: KioskVoiceCandidate; score: number } | null = null;
  for (const product of candidates) {
    const supplier = fold(product.supplier_name);
    const name = fold(product.name);
    const presentation = fold(product.presentation ?? "");
    const packaging = fold(product.packaging ?? "");
    let score = 0;
    if (supplier && supplier !== "-" && text.includes(supplier)) score += 3;
    if (name && text.includes(name)) score += 2;
    for (const token of supplier.split(" ").filter((t) => t.length > 2)) {
      if (text.includes(token)) score += 1.5;
    }
    for (const token of name.split(" ").filter((t) => t.length > 2)) {
      if (text.includes(token)) score += 0.5;
    }
    if (presentation && text.includes(presentation)) score += 1;
    if (packaging && text.includes(packaging)) score += 1;
    if (score > 0 && (!best || score > best.score)) {
      best = { product, score };
    }
  }

  if (best && best.score >= 1.5) return best.product;
  return null;
}
