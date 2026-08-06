import { describe, expect, it } from "vitest";
import { estimateInvoiceTotalWithIva } from "./invoice-total";

describe("estimateInvoiceTotalWithIva", () => {
  it("prioriza total con IVA de cabecera", () => {
    expect(
      estimateInvoiceTotalWithIva({
        headerTotalWithIva: 1_000_000,
        headerTotalNeto: 800_000,
        lineNetos: [100],
      }),
    ).toEqual({ amount: 1_000_000, source: "header_iva" });
  });

  it("usa neto de cabecera × 1.19", () => {
    expect(
      estimateInvoiceTotalWithIva({
        headerTotalNeto: 100_000,
        lineNetos: [1],
      }),
    ).toEqual({ amount: 119_000, source: "header_neto" });
  });

  it("suma líneas × 1.19", () => {
    expect(
      estimateInvoiceTotalWithIva({
        lineNetos: [50_000, 50_000],
      }),
    ).toEqual({ amount: 119_000, source: "lines_iva" });
  });
});
