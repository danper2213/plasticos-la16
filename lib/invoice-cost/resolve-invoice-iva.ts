/**
 * Detecta si los VR TOTAL de línea ya incluyen IVA (19 %) o son netos.
 * Prioriza evidencia numérica (columna IVA y totales de cabecera).
 * La pista del extractor es un respaldo, no la única fuente.
 */

export const COLOMBIA_IVA_FACTOR = 1.19;
export const COLOMBIA_IVA_RATE = 0.19;

export type InvoiceIvaInclusion = "included" | "excluded";

export type InvoiceIvaSource =
  | "line_iva"
  | "header_vs_lines"
  | "extractor"
  | "default";

export type InvoiceIvaResolution = {
  inclusion: InvoiceIvaInclusion;
  source: InvoiceIvaSource;
  confidence: "high" | "medium" | "low";
};

export function amountsNearlyEqual(
  a: number,
  b: number,
  relativeTolerance = 0.008,
): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= Math.max(50, scale * relativeTolerance);
}

export function classifyLineIva(
  valorTotal: number,
  valorIva: number,
): InvoiceIvaInclusion | null {
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) return null;
  if (!Number.isFinite(valorIva) || valorIva <= 0) return null;

  const ivaIfNet = valorTotal * COLOMBIA_IVA_RATE;
  const ivaIfGross = valorTotal * (COLOMBIA_IVA_RATE / COLOMBIA_IVA_FACTOR);
  const matchesNet = amountsNearlyEqual(valorIva, ivaIfNet);
  const matchesGross = amountsNearlyEqual(valorIva, ivaIfGross);

  if (matchesNet && !matchesGross) return "excluded";
  if (matchesGross && !matchesNet) return "included";
  return null;
}

export function resolveLineAmountWithIva(input: {
  valorTotal: number;
  valorIva?: number | null;
  invoiceInclusion?: InvoiceIvaInclusion | null;
}): { valorTotalConIva: number; inclusion: InvoiceIvaInclusion } {
  const valorTotal = Number.isFinite(input.valorTotal) ? Math.max(0, input.valorTotal) : 0;
  const valorIva =
    input.valorIva != null && Number.isFinite(input.valorIva) && input.valorIva > 0
      ? input.valorIva
      : null;

  const fromLine = valorIva != null ? classifyLineIva(valorTotal, valorIva) : null;
  const inclusion = fromLine ?? input.invoiceInclusion ?? "included";

  if (inclusion === "excluded") {
    const gross =
      valorIva != null ? valorTotal + valorIva : valorTotal * COLOMBIA_IVA_FACTOR;
    return { valorTotalConIva: round2(gross), inclusion };
  }

  return { valorTotalConIva: round2(valorTotal), inclusion };
}

export function resolveInvoiceIvaInclusion(input: {
  headerTotalWithIva?: number | null;
  headerTotalNeto?: number | null;
  headerIvaAmount?: number | null;
  lineTotals: number[];
  lineIvas?: Array<number | null | undefined>;
  extractorHint?: boolean | null;
}): InvoiceIvaResolution {
  const lineVote = voteLineIvas(input.lineTotals, input.lineIvas ?? []);
  if (lineVote && lineVote.opposing === 0 && lineVote.count > 0) {
    return {
      inclusion: lineVote.inclusion,
      source: "line_iva",
      confidence: lineVote.count >= 2 ? "high" : "medium",
    };
  }

  const fromHeader = classifyHeaderVsLines(input);
  if (fromHeader) {
    return {
      inclusion: fromHeader,
      source: "header_vs_lines",
      confidence: "high",
    };
  }

  if (lineVote && lineVote.count > lineVote.opposing) {
    return {
      inclusion: lineVote.inclusion,
      source: "line_iva",
      confidence: "medium",
    };
  }

  if (input.extractorHint === true) {
    return { inclusion: "included", source: "extractor", confidence: "medium" };
  }
  if (input.extractorHint === false) {
    return { inclusion: "excluded", source: "extractor", confidence: "medium" };
  }

  return { inclusion: "included", source: "default", confidence: "low" };
}

function voteLineIvas(
  lineTotals: number[],
  lineIvas: Array<number | null | undefined>,
): { inclusion: InvoiceIvaInclusion; count: number; opposing: number } | null {
  let included = 0;
  let excluded = 0;

  const n = Math.max(lineTotals.length, lineIvas.length);
  for (let i = 0; i < n; i++) {
    const total = lineTotals[i];
    const iva = lineIvas[i];
    if (total == null || iva == null) continue;
    const vote = classifyLineIva(total, iva);
    if (vote === "included") included += 1;
    if (vote === "excluded") excluded += 1;
  }

  if (included === 0 && excluded === 0) return null;
  if (excluded > included) {
    return { inclusion: "excluded", count: excluded, opposing: included };
  }
  return { inclusion: "included", count: included, opposing: excluded };
}

function classifyHeaderVsLines(input: {
  headerTotalWithIva?: number | null;
  headerTotalNeto?: number | null;
  headerIvaAmount?: number | null;
  lineTotals: number[];
}): InvoiceIvaInclusion | null {
  const sumLines = input.lineTotals.reduce(
    (acc, n) => acc + (Number.isFinite(n) && n > 0 ? n : 0),
    0,
  );
  if (sumLines <= 0) return null;

  const headerIva = positive(input.headerTotalWithIva);
  const headerNeto = positive(input.headerTotalNeto);
  const headerIvaAmount = positive(input.headerIvaAmount);

  if (headerIva != null && headerNeto != null) {
    if (amountsNearlyEqual(sumLines, headerIva)) return "included";
    if (amountsNearlyEqual(sumLines, headerNeto)) return "excluded";
  }

  if (headerIva != null) {
    if (amountsNearlyEqual(sumLines, headerIva)) return "included";
    if (amountsNearlyEqual(sumLines * COLOMBIA_IVA_FACTOR, headerIva)) {
      return "excluded";
    }
  }

  if (headerNeto != null) {
    if (amountsNearlyEqual(sumLines, headerNeto)) return "excluded";
    if (amountsNearlyEqual(sumLines, headerNeto * COLOMBIA_IVA_FACTOR)) {
      return "included";
    }
  }

  if (headerIvaAmount != null && headerIva == null && headerNeto == null) {
    if (amountsNearlyEqual(sumLines * COLOMBIA_IVA_RATE, headerIvaAmount)) {
      return "excluded";
    }
    if (
      amountsNearlyEqual(
        sumLines * (COLOMBIA_IVA_RATE / COLOMBIA_IVA_FACTOR),
        headerIvaAmount,
      )
    ) {
      return "included";
    }
  }

  return null;
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
