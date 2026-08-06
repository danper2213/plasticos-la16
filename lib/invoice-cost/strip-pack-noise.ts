/**
 * Quita ruido de empaque de la descripción de factura para mejorar el match
 * por nombre (Pq x 20, CJ x 400 un, BL x 50, etc.).
 */

const PACK_NOISE_RE =
  /\b(?:CJ|BL|RL|PQ|PQT|PAQ|PACA|CAJA|BULTOS?)\s*[x×]\s*\d{1,3}(?:[.,]\d{3})*(?:\s*(?:un(?:id(?:ad(?:es)?)?)?|uds?|rollos?))?\b/gi;

/** Descripción limpia para similitud / fingerprint. */
export function stripPackNoise(descripcion: string): string {
  let text = (descripcion ?? "").replace(PACK_NOISE_RE, " ");
  // Restos entre empaques: " - / " o "//"
  text = text.replace(/\s*[/|]+\s*/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  // Guiones solo decorativos al inicio/fin (conserva "anti-derrame" en medio)
  text = text.replace(/^[-–—]+\s*/g, "").replace(/\s*[-–—]+$/g, "").trim();
  return text;
}
