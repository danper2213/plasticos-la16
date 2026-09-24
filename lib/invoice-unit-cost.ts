/**
 * Costo unitario desde líneas de factura de proveedor (Calypso / film).
 *
 * Reglas:
 * - Costo de catálogo = por METRO.
 * - Si UM es MTR/MTS/MT: la cantidad YA es el metraje total.
 * - Si UM es KG: metros del rollo vienen de la descripción ("120ML" = 120 m)
 *   y se multiplican por numeroRollos (no por los kilos).
 * - "3M" / "1.25M" en descripción = ancho; "120ML" = largo en metros.
 * - El IVA de VR TOTAL se resuelve (incluido vs neto × 1.19).
 *
 *   costo = valor_total_con_iva / metros_totales
 */

import {
  COLOMBIA_IVA_FACTOR,
  type InvoiceIvaInclusion,
  resolveLineAmountWithIva,
} from "@/lib/invoice-cost/resolve-invoice-iva";
import { parsePackagingConversion } from "@/lib/parse-packaging";

/** Sufijo de unidades sueltas: un, und, ud, uds, unidad(es). */
const UNIT_SUFFIX = "(?:un(?:id(?:ad(?:es)?)?)?|uds?)";

export type InvoiceCostBasis = "metraje" | "unidad";

/** Normaliza UM de factura (CJ, BL, RL, MTR, KG …). */
export function normalizeInvoiceUm(um: string | null | undefined): string {
  return (um ?? "").trim().toUpperCase();
}

export function isMetrajeUm(um: string | null | undefined): boolean {
  const u = normalizeInvoiceUm(um);
  return (
    u === "MT" ||
    u === "MTS" ||
    u === "MTR" ||
    u === "M" ||
    u === "METRO" ||
    u === "METROS"
  );
}

export function isKgUm(um: string | null | undefined): boolean {
  const u = normalizeInvoiceUm(um);
  return u === "KG" || u === "KGS" || u === "KILO" || u === "KILOS" || u === "K";
}

/**
 * Extrae metros de largo por rollo/pieza desde la descripción.
 * Prioriza convención Calypso "120ML" (= 120 metros lineales).
 * No usa "3M" / "1.25M" (ancho).
 */
export function extractMetrosPorPieza(descripcion: string): {
  metros: number | null;
  patternFound: boolean;
} {
  const text = descripcion ?? "";

  // Calypso: 120ML | 100 ML | 70ML
  const mlValues: number[] = [];
  const mlRe = /(\d{1,4})\s*ML\b/gi;
  let mlMatch: RegExpExecArray | null;
  while ((mlMatch = mlRe.exec(text)) != null) {
    const n = Number.parseInt(mlMatch[1], 10);
    if (Number.isFinite(n) && n > 0) mlValues.push(n);
  }
  if (mlValues.length > 0) {
    return { metros: Math.max(...mlValues), patternFound: true };
  }

  const values: number[] = [];
  const patterns = [
    /(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?\s*(?:mts|metros|mt)\b/gi,
    // "300 m" / "300m" — no "mm" ni el "M" de ancho tipo "3M" sin espacio+palabra
    /(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?\s+m\b(?![mta-z])/gi,
  ];

  for (const pattern of patterns) {
    const global = new RegExp(pattern.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = global.exec(text)) != null) {
      const n = parseDecimalAmount(match[1]);
      if (n != null && n >= 5) values.push(n);
    }
  }

  if (values.length === 0) {
    return { metros: null, patternFound: false };
  }

  return { metros: Math.max(...values), patternFound: true };
}

/**
 * Extrae unidades por empaque desde DESCRIPCIÓN, priorizando la UM de la línea.
 * Si no hay patrón reconocible, devuelve 1 (fallback).
 */
export function extractUnidadesPorEmpaque(
  descripcion: string,
  um: string | null | undefined,
): { unidadesPorEmpaque: number; patternFound: boolean } {
  const text = descripcion ?? "";
  const normalizedUm = normalizeInvoiceUm(um);

  const primary = matchPrimaryPackPattern(text, normalizedUm);
  if (primary != null) {
    return { unidadesPorEmpaque: primary, patternFound: true };
  }

  const secondary = matchSecondaryPackPattern(text);
  if (secondary != null) {
    return { unidadesPorEmpaque: secondary, patternFound: true };
  }

  return { unidadesPorEmpaque: 1, patternFound: false };
}

/** Unidades del empaque del catálogo (`Paca x20`, `Cj x400`). */
export function extractCatalogPackUnits(
  packaging: string | null | undefined,
): number | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed || parsed.factor <= 0) return null;
  return parsed.factor;
}

/**
 * Costo de catálogo: precio unitario de la factura (sin IVA) × 1,19,
 * dividido por las unidades que el producto trae en la base.
 */
export function costFromCatalogUnitPrice(
  precioUnitario: number,
  unidades: number,
): { valorConIva: number; costoUnitario: number } {
  const valorConIva = round2(precioUnitario * COLOMBIA_IVA_FACTOR);
  const costoUnitario = unidades > 0 ? round2(valorConIva / unidades) : 0;
  return { valorConIva, costoUnitario };
}

/**
 * Si el precio unitario quedó mil veces por debajo del total de la línea
 * (`34` en vez de `34.000`), lo devuelve a pesos.
 */
export function alignUnitPriceToLineTotal(
  precioUnitario: number,
  cantidad: number,
  valorTotal: number,
): number {
  if (!(precioUnitario > 0) || !(cantidad > 0) || !(valorTotal > 0)) {
    return precioUnitario;
  }
  let aligned = precioUnitario;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ratio = valorTotal / (aligned * cantidad);
    if (ratio >= 800 && ratio <= 1200) {
      aligned = round2(aligned * 1000);
      continue;
    }
    break;
  }
  return aligned;
}

export interface InvoiceLineCostInput {
  descripcion: string;
  /** Unidad de medida de la línea: MTR, KG, RL, CJ, etc. */
  um: string;
  /** Cantidad facturada (metros, kilos, rollos…). */
  cantidad: number;
  /** VR TOTAL de la línea, tal como aparece (con o sin IVA). */
  valorTotalNeto: number;
  valorIva?: number;
  /** Decisión a nivel factura; la columna IVA de la línea puede anularla. */
  invoiceIvaInclusion?: InvoiceIvaInclusion;
  /** Metros por rollo (de "120ML" o IA). */
  metrosPorUnidad?: number | null;
  /**
   * Cantidad de rollos cuando UM es KG.
   * Metros totales = numeroRollos × metrosPorUnidad.
   */
  numeroRollos?: number | null;
  /** Atajo: metros totales de la línea (si la IA ya los calculó). */
  metrajeTotal?: number | null;
}

export interface InvoiceLineCostResult {
  /** Metros por rollo (o 1 si UM=MTR). */
  unidadesPorEmpaque: number;
  /** Metros totales (base del costo). */
  totalUnidades: number;
  valorTotalConIva: number;
  /** Costo por metro o unidad (base con IVA), 2 decimales. */
  costoUnitario: number;
  packPatternFound: boolean;
  costBasis: InvoiceCostBasis;
  unitLabel: "m" | "un";
  numeroRollos?: number;
  ivaInclusion: InvoiceIvaInclusion;
  ivaValidation?: {
    sumaNetoMasIva: number;
    matches: boolean;
  };
}

/**
 * Calcula el costo por metro (o por unidad si no hay metraje).
 */
export function calculateInvoiceUnitCost(
  input: InvoiceLineCostInput,
): InvoiceLineCostResult {
  const cantidad = toPositiveNumber(input.cantidad, 0);
  const resolvedIva = resolveLineAmountWithIva({
    valorTotal: toNonNegativeNumber(input.valorTotalNeto, 0),
    valorIva: input.valorIva,
    invoiceInclusion: input.invoiceIvaInclusion,
  });
  const valorTotalConIva = resolvedIva.valorTotalConIva;
  const um = normalizeInvoiceUm(input.um);

  const resolved = resolveCostBasis({
    descripcion: input.descripcion,
    um,
    cantidad,
    metrosPorUnidadHint: input.metrosPorUnidad,
    numeroRollosHint: input.numeroRollos,
    metrajeTotalHint: input.metrajeTotal,
  });

  const costoUnitario =
    resolved.totalBase > 0
      ? round2(valorTotalConIva / resolved.totalBase)
      : 0;

  const result: InvoiceLineCostResult = {
    unidadesPorEmpaque: resolved.factor,
    totalUnidades: resolved.totalBase,
    valorTotalConIva,
    costoUnitario,
    packPatternFound: resolved.patternFound,
    costBasis: resolved.costBasis,
    unitLabel: resolved.unitLabel,
    numeroRollos: resolved.numeroRollos,
    ivaInclusion: resolvedIva.inclusion,
  };

  if (input.valorIva != null && Number.isFinite(input.valorIva)) {
    if (resolvedIva.inclusion === "excluded") {
      const neto = toNonNegativeNumber(input.valorTotalNeto, 0);
      result.ivaValidation = {
        sumaNetoMasIva: round2(neto + input.valorIva),
        matches: round2(neto + input.valorIva) === valorTotalConIva,
      };
    } else {
      const impliedNeto = round2(valorTotalConIva - input.valorIva);
      result.ivaValidation = {
        sumaNetoMasIva: round2(impliedNeto + input.valorIva),
        matches:
          impliedNeto > 0 &&
          round2(impliedNeto * COLOMBIA_IVA_FACTOR) === valorTotalConIva,
      };
    }
  }

  return result;
}

function resolveCostBasis(args: {
  descripcion: string;
  um: string;
  cantidad: number;
  metrosPorUnidadHint?: number | null;
  numeroRollosHint?: number | null;
  metrajeTotalHint?: number | null;
}): {
  factor: number;
  totalBase: number;
  costBasis: InvoiceCostBasis;
  unitLabel: "m" | "un";
  patternFound: boolean;
  numeroRollos?: number;
} {
  const {
    descripcion,
    um,
    cantidad,
    metrosPorUnidadHint,
    numeroRollosHint,
    metrajeTotalHint,
  } = args;

  // 1) UM en metros (MTR): la cantidad ES el metraje total
  if (isMetrajeUm(um)) {
    return {
      factor: 1,
      totalBase: cantidad,
      costBasis: "metraje",
      unitLabel: "m",
      patternFound: true,
    };
  }

  const totalHint =
    metrajeTotalHint != null &&
    Number.isFinite(metrajeTotalHint) &&
    metrajeTotalHint > 0
      ? metrajeTotalHint
      : null;

  const hint =
    metrosPorUnidadHint != null &&
    Number.isFinite(metrosPorUnidadHint) &&
    metrosPorUnidadHint > 0
      ? metrosPorUnidadHint
      : null;
  const fromText = extractMetrosPorPieza(descripcion);
  const metrosPorRollo = hint ?? fromText.metros;

  // 2) Metraje total ya resuelto por IA
  if (totalHint != null) {
    return {
      factor:
        metrosPorRollo && metrosPorRollo > 0
          ? metrosPorRollo
          : cantidad > 0
            ? round2(totalHint / Math.max(cantidad, 1))
            : totalHint,
      totalBase: totalHint,
      costBasis: "metraje",
      unitLabel: "m",
      patternFound: true,
      numeroRollos:
        metrosPorRollo && metrosPorRollo > 0
          ? round2(totalHint / metrosPorRollo)
          : undefined,
    };
  }

  // 3) UM en KG: kilos solo sirven para saber cuántos rollos; el costo es por metro
  if (isKgUm(um) && metrosPorRollo != null && metrosPorRollo > 0) {
    const rolls =
      numeroRollosHint != null &&
      Number.isFinite(numeroRollosHint) &&
      numeroRollosHint > 0
        ? numeroRollosHint
        : 1;

    return {
      factor: metrosPorRollo,
      totalBase: rolls * metrosPorRollo,
      costBasis: "metraje",
      unitLabel: "m",
      patternFound: hint != null || fromText.patternFound,
      numeroRollos: rolls,
    };
  }

  // 4) Rollos/cajas u otras UM: cantidad × metros del rollo
  if (metrosPorRollo != null && metrosPorRollo > 0) {
    return {
      factor: metrosPorRollo,
      totalBase: cantidad * metrosPorRollo,
      costBasis: "metraje",
      unitLabel: "m",
      patternFound: hint != null || fromText.patternFound,
      numeroRollos: cantidad,
    };
  }

  // 5) Sin metraje → empaque en unidades
  const pack = extractUnidadesPorEmpaque(descripcion, um);
  return {
    factor: pack.unidadesPorEmpaque,
    totalBase: cantidad * pack.unidadesPorEmpaque,
    costBasis: "unidad",
    unitLabel: "un",
    patternFound: pack.patternFound,
  };
}

// --- RegEx helpers -----------------------------------------------------------

function packAmountPattern(prefix: string, unitSuffix: string): RegExp {
  const pref = escapeRegExp(prefix);
  return new RegExp(
    `\\b${pref}\\s*[x×]\\s*(\\d{1,3}(?:[.,]\\d{3})*|\\d+)\\s*${unitSuffix}\\b`,
    "gi",
  );
}

function matchPrimaryPackPattern(text: string, um: string): number | null {
  if (um === "CJ") {
    return maxMatchAmount(text, [packAmountPattern("CJ", UNIT_SUFFIX)]);
  }

  if (um === "BL") {
    return maxMatchAmount(text, [packAmountPattern("BL", UNIT_SUFFIX)]);
  }

  if (um === "RL") {
    return maxMatchAmount(text, [
      packAmountPattern("CJ", "rollos?"),
      packAmountPattern("PQ", "rollos?"),
      packAmountPattern("PQT", "rollos?"),
    ]);
  }

  if (um && !isMetrajeUm(um) && !isKgUm(um)) {
    return maxMatchAmount(text, [packAmountPattern(um, UNIT_SUFFIX)]);
  }

  return null;
}

function matchSecondaryPackPattern(text: string): number | null {
  return maxMatchAmount(text, [
    packAmountPattern("PQ", UNIT_SUFFIX),
    packAmountPattern("PQT", UNIT_SUFFIX),
    packAmountPattern("PAQ", UNIT_SUFFIX),
    packAmountPattern("PACA", UNIT_SUFFIX),
    // "GRANEL X 500" / "X 500". No toma "X 120ML" ni "X 300 m".
    /(?:granel\s+)?[x×]\s*(\d{2,4})(?!\s*(?:ml|mts?|metros|mm)\b)/gi,
  ]);
}

function maxMatchAmount(text: string, patterns: RegExp[]): number | null {
  let best: number | null = null;

  for (const pattern of patterns) {
    const global = new RegExp(pattern.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = global.exec(text)) != null) {
      const n = parsePackInteger(match[1]);
      if (n == null) continue;
      if (best == null || n > best) best = n;
    }
  }

  return best;
}

function parsePackInteger(raw: string): number | null {
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "");
  const n = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseDecimalAmount(raw: string): number | null {
  let s = raw.trim();
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    if (/,\d{3}$/.test(s) && !/\.\d/.test(s)) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPositiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toNonNegativeNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
