import { describe, expect, it } from "vitest";
import {
  calculateInvoiceUnitCost,
  extractMetrosPorPieza,
} from "@/lib/invoice-unit-cost";

describe("extractMetrosPorPieza — convención Calypso ML", () => {
  it("lee 120ML y no el ancho 3M", () => {
    expect(
      extractMetrosPorPieza("POLIETILENO NEGRO 3M X CAL. 6 X 120ML PA"),
    ).toEqual({ metros: 120, patternFound: true });
  });

  it("lee 100ML en cartón (ancho 1.25M)", () => {
    expect(
      extractMetrosPorPieza("CARTON CORRUGADO 1.25M X 100ML - PP"),
    ).toEqual({ metros: 100, patternFound: true });
  });
});

describe("Factura Calypso — costos esperados por metro", () => {
  it("1. CARTON CORRUGADO — UM MTR, 300 m directos", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "CARTON CORRUGADO 1.25M X 100ML - PP",
      um: "MTR",
      cantidad: 300,
      valorTotalNeto: 592_389.06,
    });

    expect(result.costBasis).toBe("metraje");
    expect(result.totalUnidades).toBe(300);
    expect(result.valorTotalConIva).toBe(592_389.06);
    expect(result.costoUnitario).toBe(1_974.63);
  });

  it("2. POLIETILENO 120ML — 1 rollo (53,84 kg)", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "POLIETILENO NEGRO 3M X CAL. 6 X 120ML PA",
      um: "KG",
      cantidad: 53.84,
      valorTotalNeto: 416_250.16,
      numeroRollos: 1,
    });

    expect(result.unidadesPorEmpaque).toBe(120);
    expect(result.totalUnidades).toBe(120);
    expect(result.valorTotalConIva).toBe(416_250.16);
    expect(result.costoUnitario).toBe(3_468.75);
  });

  it("3. POLIETILENO 100ML — 2 rollos (121,10 kg)", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "POLIETILENO NEGRO 80:20 4M X CAL. 6 X 100ML PL -BQ",
      um: "KG",
      cantidad: 121.1,
      valorTotalNeto: 997_281.4,
      numeroRollos: 2,
    });

    expect(result.unidadesPorEmpaque).toBe(100);
    expect(result.totalUnidades).toBe(200);
    expect(result.valorTotalConIva).toBe(997_281.4);
    expect(result.costoUnitario).toBe(4_986.41);
  });

  it("4. POLIETILENO 70ML — 1 rollo (64,20 kg)", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "POLIETILENO NEGRO CORRIENTE 6M X C6 X 70ML",
      um: "KG",
      cantidad: 64.2,
      valorTotalNeto: 523_337.09,
      numeroRollos: 1,
    });

    expect(result.totalUnidades).toBe(70);
    expect(result.valorTotalConIva).toBe(523_337.09);
    expect(result.costoUnitario).toBe(7_476.24);
  });

  it("5. POLIETILENO 50ML — 1 rollo (73,28 kg)", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "POLIETILENO NEGRO 10M X CAL. 6 X 50ML - PA",
      um: "KG",
      cantidad: 73.28,
      valorTotalNeto: 825_150.04,
      numeroRollos: 1,
    });

    expect(result.totalUnidades).toBe(50);
    expect(result.valorTotalConIva).toBe(825_150.04);
    expect(result.costoUnitario).toBe(16_503);
  });

  it("metrajeTotal directo también funciona", () => {
    const result = calculateInvoiceUnitCost({
      descripcion: "POLIETILENO NEGRO 80:20 4M X CAL. 6 X 100ML PL -BQ",
      um: "KG",
      cantidad: 121.1,
      valorTotalNeto: 997_281.4,
      metrajeTotal: 200,
      metrosPorUnidad: 100,
    });

    expect(result.totalUnidades).toBe(200);
    expect(result.costoUnitario).toBe(4_986.41);
  });
});
