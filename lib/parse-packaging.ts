/**
 * Parsea el campo "Caja madre" / packaging del producto para obtener
 * unidad de entrada y factor a unidad base.
 * Ejemplos: "Caja x60 paq" → 1 Caja = 60 paquetes; "Caja madre x10" → 1 Caja madre = 10.
 */
export interface ParsedPackaging {
  /** Nombre de la unidad (ej. "Caja", "Caja madre") */
  unitName: string;
  /** Cuántas unidades base equivale 1 de esta unidad */
  factor: number;
  /** Texto opcional de la unidad base para mostrar (ej. "paq" → "paquetes") */
  baseLabel?: string;
}

/**
 * Intenta extraer de un texto tipo "Caja x60 paq" o "Caja madre x10":
 * - unitName: texto antes de "x" (ej. "Caja")
 * - factor: número después de "x" (ej. 60)
 * - baseLabel: resto opcional (ej. "paq")
 * Acepta "x" o "×" como separador.
 */
export function parsePackagingConversion(text: string | null | undefined): ParsedPackaging | null {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return null;

  // Patrón: [Nombre opcional] x o × [número] [resto opcional]
  // Ej: "Caja x60 paq", "Caja madre x10", "x60 paq"
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

  // Solo "x60" o "x 60 paq"
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
