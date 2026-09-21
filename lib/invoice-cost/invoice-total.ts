/**
 * Total de factura para CxP.
 * Preferimos el total con IVA de cabecera; si no, el neto de cabecera × 1.19;
 * si no, la suma de líneas (con IVA si ya lo traen; × 1.19 si son netas).
 */

import { COLOMBIA_IVA_FACTOR } from "@/lib/invoice-cost/resolve-invoice-iva";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type InvoiceTotalSource =
  | "header_iva"
  | "header_neto"
  | "lines_iva"
  | "lines_neto";

export function estimateInvoiceTotalWithIva(args: {
  headerTotalWithIva?: number | null;
  headerTotalNeto?: number | null;
  lineNetos: number[];
  /** false = las líneas son netas y hay que aplicar 19 %. */
  lineTotalsIncludeIva?: boolean;
}): { amount: number; source: InvoiceTotalSource } {
  const headerIva = args.headerTotalWithIva;
  if (headerIva != null && Number.isFinite(headerIva) && headerIva > 0) {
    return { amount: round2(headerIva), source: "header_iva" };
  }

  const headerNeto = args.headerTotalNeto;
  if (headerNeto != null && Number.isFinite(headerNeto) && headerNeto > 0) {
    return { amount: round2(headerNeto * COLOMBIA_IVA_FACTOR), source: "header_neto" };
  }

  const sumLines = args.lineNetos.reduce(
    (acc, n) => acc + (Number.isFinite(n) && n > 0 ? n : 0),
    0,
  );
  if (args.lineTotalsIncludeIva === false) {
    return { amount: round2(sumLines * COLOMBIA_IVA_FACTOR), source: "lines_neto" };
  }
  return { amount: round2(sumLines), source: "lines_iva" };
}
