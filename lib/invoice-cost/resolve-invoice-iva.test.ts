import { describe, expect, it } from "vitest";
import {
  classifyLineIva,
  resolveInvoiceIvaInclusion,
  resolveLineAmountWithIva,
} from "./resolve-invoice-iva";

describe("classifyLineIva", () => {
  it("detecta VR TOTAL neto (IVA = 19 % del valor)", () => {
    expect(classifyLineIva(100_000, 19_000)).toBe("excluded");
  });

  it("detecta VR TOTAL con IVA (IVA = 19/119 del valor)", () => {
    const gross = 119_000;
    const iva = Math.round(((gross / 1.19) * 0.19) * 100) / 100;
    expect(classifyLineIva(gross, iva)).toBe("included");
  });

  it("ignora IVA en cero", () => {
    expect(classifyLineIva(100_000, 0)).toBeNull();
  });
});

describe("resolveInvoiceIvaInclusion", () => {
  it("usa la columna IVA de las líneas cuando es unánime", () => {
    expect(
      resolveInvoiceIvaInclusion({
        lineTotals: [100_000, 200_000],
        lineIvas: [19_000, 38_000],
        headerTotalWithIva: 357_000,
      }),
    ).toMatchObject({
      inclusion: "excluded",
      source: "line_iva",
    });
  });

  it("compara suma de líneas con total a pagar (IVA ya incluido)", () => {
    expect(
      resolveInvoiceIvaInclusion({
        lineTotals: [592_389.06, 416_250.16],
        headerTotalWithIva: 1_008_639.22,
      }),
    ).toMatchObject({
      inclusion: "included",
      source: "header_vs_lines",
    });
  });

  it("compara suma de líneas × 1.19 con total a pagar (IVA no incluido)", () => {
    expect(
      resolveInvoiceIvaInclusion({
        lineTotals: [100_000, 200_000],
        headerTotalWithIva: 357_000,
      }),
    ).toMatchObject({
      inclusion: "excluded",
      source: "header_vs_lines",
    });
  });

  it("usa suma igual al neto de cabecera como sin IVA", () => {
    expect(
      resolveInvoiceIvaInclusion({
        lineTotals: [80_000],
        headerTotalNeto: 80_000,
      }),
    ).toMatchObject({
      inclusion: "excluded",
      source: "header_vs_lines",
    });
  });

  it("usa la pista del extractor si no hay números de IVA", () => {
    expect(
      resolveInvoiceIvaInclusion({
        lineTotals: [50_000],
        extractorHint: false,
      }),
    ).toMatchObject({
      inclusion: "excluded",
      source: "extractor",
    });
  });

  it("por defecto asume IVA incluido (Calypso / VR TOTAL)", () => {
    expect(
      resolveInvoiceIvaInclusion({
        lineTotals: [416_250.16],
      }),
    ).toMatchObject({
      inclusion: "included",
      source: "default",
    });
  });
});

describe("resolveLineAmountWithIva", () => {
  it("no multiplica si el valor ya trae IVA", () => {
    expect(
      resolveLineAmountWithIva({
        valorTotal: 416_250.16,
        invoiceInclusion: "included",
      }),
    ).toEqual({ valorTotalConIva: 416_250.16, inclusion: "included" });
  });

  it("aplica 19 % si el VR TOTAL es neto", () => {
    expect(
      resolveLineAmountWithIva({
        valorTotal: 100_000,
        invoiceInclusion: "excluded",
      }),
    ).toEqual({ valorTotalConIva: 119_000, inclusion: "excluded" });
  });

  it("suma IVA de línea si el valor es neto y hay columna IVA", () => {
    expect(
      resolveLineAmountWithIva({
        valorTotal: 100_000,
        valorIva: 19_000,
      }),
    ).toEqual({ valorTotalConIva: 119_000, inclusion: "excluded" });
  });
});
