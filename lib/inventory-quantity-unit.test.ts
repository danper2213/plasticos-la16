import { describe, expect, it } from "vitest";
import {
  defaultQuantityUnit,
  getLooseUnitLabel,
  maxOutInQuantityUnit,
  quantityToStockUnits,
  resolveExitUnitOptions,
} from "./inventory-quantity-unit";

describe("quantityToStockUnits", () => {
  it("pack: 1 paca = 1 stock", () => {
    expect(quantityToStockUnits(1, "pack", "Paca x500")).toBe(1);
    expect(quantityToStockUnits(3, "pack", "Paca x500")).toBe(3);
  });

  it("unit: 500 tulas = 1 paca en stock", () => {
    expect(quantityToStockUnits(500, "unit", "Paca x500")).toBe(1);
    expect(quantityToStockUnits(50, "unit", "Paca x500")).toBe(0.1);
    expect(quantityToStockUnits(1, "unit", "Paca x500")).toBe(0.002);
  });

  it("sin empaque grande: unit 1:1", () => {
    expect(quantityToStockUnits(4, "unit", "Tula")).toBe(4);
    expect(quantityToStockUnits(4, "pack", null)).toBe(4);
  });
});

describe("resolveExitUnitOptions", () => {
  it("Paca x500 ofrece paca y tula (presentation)", () => {
    const opts = resolveExitUnitOptions("Paca x500", "Tula");
    expect(opts.map((o) => o.value)).toEqual(["pack", "unit"]);
    expect(opts[0]?.label).toBe("Paca");
    expect(opts[1]?.label).toBe("Tula");
  });

  it("sin xN solo unidad", () => {
    const opts = resolveExitUnitOptions("Tula", "Tula");
    expect(opts).toHaveLength(1);
    expect(opts[0]?.value).toBe("unit");
  });
});

describe("defaultQuantityUnit / maxOut", () => {
  it("default pack si hay factor", () => {
    expect(defaultQuantityUnit("Paca x500")).toBe("pack");
    expect(defaultQuantityUnit("Tula")).toBe("unit");
  });

  it("max out en unidades = stock × factor", () => {
    expect(maxOutInQuantityUnit(2, "unit", "Paca x500")).toBe(1000);
    expect(maxOutInQuantityUnit(2, "pack", "Paca x500")).toBe(2);
  });
});

describe("getLooseUnitLabel", () => {
  it("usa presentation", () => {
    expect(getLooseUnitLabel("Paca x500", "Tula")).toBe("Tula");
  });
});
