/**
 * Extrae nombre de unidad y contenido descriptivo del empaque.
 *
 * Ejemplo "Cj x70": 1 Cj trae 70 unidades internas — eso es solo referencia.
 * En inventario se cuenta en Cj: stock 10 = diez cajas, no 700 unidades sueltas.
 */
export interface ParsedPackaging {
  /** Nombre de la unidad de inventario (ej. "Cj", "Paca", "Caja") */
  unitName: string;
  /** Contenido por unidad (ej. 70 en "Cj x70"). Solo descriptivo; no usar en stock. */
  factor: number;
  /** Texto opcional del contenido (ej. "paq" → "paquetes") */
  baseLabel?: string;
}

/**
 * Parsea "Cj x70", "Paca x200", "Caja madre x10", etc.
 * El número después de x es contenido interno, no unidad de movimiento.
 */
export function parsePackagingConversion(text: string | null | undefined): ParsedPackaging | null {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return null;

  const withName = raw.match(/^(.+?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/i);
  if (withName) {
    const unitName = withName[1].trim();
    const factorStr = withName[2].replace(",", ".");
    const factor = parseFloat(factorStr);
    const baseLabel = withName[3]?.trim() || undefined;
    if (unitName && Number.isFinite(factor) && factor > 0) {
      return { unitName, factor, baseLabel };
    }
  }

  const onlyFactor = raw.match(/\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/i);
  if (onlyFactor) {
    const factor = parseFloat(onlyFactor[1].replace(",", "."));
    const baseLabel = onlyFactor[2]?.trim() || undefined;
    if (Number.isFinite(factor) && factor > 0) {
      return { unitName: "Unidad", factor, baseLabel };
    }
  }

  return null;
}
