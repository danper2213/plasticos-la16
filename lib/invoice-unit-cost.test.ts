import { describe, expect, it } from "vitest";
import {
  calculateInvoiceUnitCost,
  extractMetrosPorPieza,
  extractUnidadesPorEmpaque,
} from "./invoice-unit-cost";

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
  it("calcula costo unitario con IVA a 2 decimales", () => {
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
    expect(result.valorTotalConIva).toBe(4_852_820);
    expect(result.costoUnitario).toBe(606.6);
    expect(result.packPatternFound).toBe(true);
  });

  it("valida VALOR IVA opcional", () => {
    const neto = 4_078_000;
    const iva = round2(neto * 0.19);
    const result = calculateInvoiceUnitCost({
      descripcion: "Item - CJ x 400 un",
      um: "CJ",
      cantidad: 20,
      valorTotalNeto: neto,
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
    expect(result.costoUnitario).toBe(round2(119_000 / 600));
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
    expect(result.costoUnitario).toBe(round2(59_500 / 1_000));
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
    expect(result.costoUnitario).toBe(round2(357_000 / 1500));
  });
});

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
