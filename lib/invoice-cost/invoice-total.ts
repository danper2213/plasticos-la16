/**
 * Total de factura para CxP.
 * Preferimos el total con IVA de cabecera; si no, sumamos líneas × 1.19.
 */

const IVA_FACTOR = 1.19;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function estimateInvoiceTotalWithIva(args: {
  headerTotalWithIva?: number | null;
  headerTotalNeto?: number | null;
  lineNetos: number[];
}): { amount: number; source: "header_iva" | "header_neto" | "lines_iva" } {
  const headerIva = args.headerTotalWithIva;
  if (headerIva != null && Number.isFinite(headerIva) && headerIva > 0) {
    return { amount: round2(headerIva), source: "header_iva" };
  }

  const headerNeto = args.headerTotalNeto;
  if (headerNeto != null && Number.isFinite(headerNeto) && headerNeto > 0) {
    return { amount: round2(headerNeto * IVA_FACTOR), source: "header_neto" };
  }

  const sumNeto = args.lineNetos.reduce(
    (acc, n) => acc + (Number.isFinite(n) && n > 0 ? n : 0),
    0,
  );
  return { amount: round2(sumNeto * IVA_FACTOR), source: "lines_iva" };
}
