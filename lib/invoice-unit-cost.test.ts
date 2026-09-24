import { describe, expect, it } from "vitest";
import {
  alignUnitPriceToLineTotal,
  calculateInvoiceUnitCost,
  costFromCatalogUnitPrice,
  extractCatalogPackUnits,
  extractMetrosPorPieza,
  extractUnidadesPorEmpaque,
} from "./invoice-unit-cost";

describe("costFromCatalogUnitPrice", () => {
  it("aplica IVA y divide por el empaque del catálogo", () => {
    expect(extractCatalogPackUnits("Paca x20")).toBe(20);
    expect(extractCatalogPackUnits("Cj x400")).toBe(400);
    expect(costFromCatalogUnitPrice(27_193.28, 20)).toEqual({
      valorConIva: 32_360,
      costoUnitario: 1618,
    });
    expect(costFromCatalogUnitPrice(34_000, 25)).toEqual({
      valorConIva: 40_460,
      costoUnitario: 1618.4,
    });
    expect(alignUnitPriceToLineTotal(34, 12, 408_000)).toBe(34_000);
  });
});

describe("extractUnidadesPorEmpaque", () => {
  it("prioriza CJ x N un cuando UM es CJ (aunque exista Pq x N)", () => {
    const desc =
      "Contenedor Espumado 16 oz Blanco con Tapa Espumada - Pq x 20 un/CJ x 400 un";
    expect(extractUnidadesPorEmpaque(desc, "CJ")).toEqual({
      unidadesPorEmpaque: 400,
      patternFound: true,
    });
  });

  it("extrae BL x N un cuando UM es BL", () => {
    expect(
      extractUnidadesPorEmpaque("Producto demo - BL x 50 un", "BL"),
    ).toEqual({ unidadesPorEmpaque: 50, patternFound: true });
  });

  it("extrae rollos cuando UM es RL", () => {
    expect(
      extractUnidadesPorEmpaque("Film stretch - CJ x 6 rollos", "RL"),
    ).toEqual({ unidadesPorEmpaque: 6, patternFound: true });

    expect(
      extractUnidadesPorEmpaque("Cinta - Pq x 12 rollo", "RL"),
    ).toEqual({ unidadesPorEmpaque: 12, patternFound: true });
  });

  it("usa patrón secundario Pq x N un si no hay match de UM", () => {
    expect(
      extractUnidadesPorEmpaque("Item sin caja - Pq x 24 un", "CJ"),
    ).toEqual({ unidadesPorEmpaque: 24, patternFound: true });
  });

  it("lee GRANEL X 500 como unidades por paca, no como metraje", () => {
    expect(
      extractUnidadesPorEmpaque(
        "BANDEJA 1 BLANCO ESPUMADO GRANEL X 500",
        "PACA",
      ),
    ).toEqual({ unidadesPorEmpaque: 500, patternFound: true });

    const result = calculateInvoiceUnitCost({
      descripcion: "BANDEJA 1 BLANCO ESPUMADO GRANEL X 500",
      um: "PACA",
      cantidad: 12,
      valorTotalNeto: 408_000,
    });

    expect(result.costBasis).toBe("unidad");
    expect(result.unidadesPorEmpaque).toBe(500);
    expect(result.totalUnidades).toBe(6_000);
    expect(result.costoUnitario).toBe(68);
  });

  it("fallback a 1 si no hay patrón", () => {
    expect(extractUnidadesPorEmpaque("Producto sin empaque explícito", "CJ")).toEqual({
      unidadesPorEmpaque: 1,
      patternFound: false,
    });
  });

  it("tolera separadores de miles y ×", () => {
    expect(
      extractUnidadesPorEmpaque("Caja grande - CJ × 1.200 un", "CJ"),
    ).toEqual({ unidadesPorEmpaque: 1200, patternFound: true });
  });
});

describe("extractMetrosPorPieza", () => {
  it("toma metros y no el ancho en mm", () => {
    expect(extractMetrosPorPieza("FILM STRETCH 500 mm x 300 mts")).toEqual({
      metros: 300,
      patternFound: true,
    });
  });

  it("acepta '300 m' con espacio", () => {
    expect(extractMetrosPorPieza("Rollo 50cm x 300 m negro")).toEqual({
      metros: 300,
      patternFound: true,
    });
  });
});

describe("calculateInvoiceUnitCost — unidades", () => {
  it("calcula costo unitario con VR TOTAL (IVA ya incluido)", () => {
    const result = calculateInvoiceUnitCost({
      descripcion:
        "Contenedor Espumado 16 oz Blanco con Tapa Espumada - Pq x 20 un/CJ x 400 un",
      um: "CJ",
      cantidad: 20,
      valorTotalNeto: 4_078_000,
    });

    expect(result.costBasis).toBe("unidad");
    expect(result.unitLabel).toBe("un");
    expect(result.unidadesPorEmpaque).toBe(400);
    expect(result.totalUnidades).toBe(8000);
    expect(result.valorTotalConIva).toBe(4_078_000);
    expect(result.ivaInclusion).toBe("included");
    expect(result.costoUnitario).toBe(509.75);
    expect(result.packPatternFound).toBe(true);
  });

  it("aplica 19 % cuando el VR TOTAL es neto", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "Item - CJ x 400 un",
      um: "CJ",
      cantidad: 20,
      valorTotalNeto: 4_078_000,
      invoiceIvaInclusion: "excluded",
    });

    expect(result.ivaInclusion).toBe("excluded");
    expect(result.valorTotalConIva).toBe(4_852_820);
    expect(result.costoUnitario).toBe(606.6);
  });

  it("valida VALOR IVA opcional contra VR TOTAL con IVA", () => {
    const conIva = 4_852_820;
    const iva = round2((conIva / 1.19) * 0.19);
    const result = calculateInvoiceUnitCost({
      descripcion: "Item - CJ x 400 un",
      um: "CJ",
      cantidad: 20,
      valorTotalNeto: conIva,
      valorIva: iva,
    });

    expect(result.ivaValidation?.matches).toBe(true);
    expect(result.ivaValidation?.sumaNetoMasIva).toBe(result.valorTotalConIva);
  });
});

describe("calculateInvoiceUnitCost — metraje", () => {
  it("UM=KG usa rollos × ML, no kilos × metros", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "FILM 3M X 300ML",
      um: "KG",
      cantidad: 10,
      valorTotalNeto: 100_000,
      numeroRollos: 2,
    });

    expect(result.costBasis).toBe("metraje");
    expect(result.unidadesPorEmpaque).toBe(300);
    expect(result.totalUnidades).toBe(600);
    expect(result.costoUnitario).toBe(round2(100_000 / 600));
  });

  it("UM=RL usa cantidad × metros", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "POLIETILENO 1.20 x 200 metros",
      um: "RL",
      cantidad: 5,
      valorTotalNeto: 50_000,
    });

    expect(result.costBasis).toBe("metraje");
    expect(result.unidadesPorEmpaque).toBe(200);
    expect(result.totalUnidades).toBe(1_000);
    expect(result.costoUnitario).toBe(round2(50_000 / 1_000));
  });

  it("si UM es MTR, la cantidad es el metraje total", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "CARTON 1.25M X 100ML",
      um: "MTR",
      cantidad: 1500,
      valorTotalNeto: 300_000,
    });

    expect(result.costBasis).toBe("metraje");
    expect(result.totalUnidades).toBe(1500);
    expect(result.costoUnitario).toBe(round2(300_000 / 1500));
  });
});

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
