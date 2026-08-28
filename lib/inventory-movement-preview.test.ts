import { describe, expect, it } from "vitest";
import {
  buildLinePreviews,
  computeLineBalanceAfter,
  simulateStockAfterLines,
  sumStockDeltasByProduct,
} from "./inventory-movement-preview";
import { inventoryStockAfter } from "./inventory-units";
import { lineStockDelta } from "./inventory-stock-delta";
import { getStockDisplayInfo, formatMovementQuantityLabel, getInventoryUnitLabel } from "./inventory-stock-display";
import { validateMovementLine } from "./inventory-movement-validation";
import { parsePackagingConversion } from "./parse-packaging";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

/** Regla de negocio: stock y movimientos en cajas/pacas; x70/x200 solo descriptivo. */
const CJ_X70 = "Cj x70";
const PACA_X200 = "Paca x200";
const PQT_X20 = "Pqt x20";

describe("convención: 1 caja/paca = ±1 en stock (sin usar x70/x200)", () => {
  it("entrada de 1 Cj suma 1, no 70", () => {
    expect(inventoryStockAfter(10, lineStockDelta({ movement_type: "in", quantity: 1 }))).toBe(
      11,
    );
    expect(
      simulateStockAfterLines(10, [
        { product_id: PRODUCT_ID, movement_type: "in", quantity: 1 },
      ]),
    ).toBe(11);
  });

  it("salida de 1 Paca resta 1, no 200", () => {
    expect(inventoryStockAfter(10, lineStockDelta({ movement_type: "out", quantity: 1 }))).toBe(
      9,
    );
    expect(
      simulateStockAfterLines(10, [
        { product_id: PRODUCT_ID, movement_type: "out", quantity: 1 },
      ]),
    ).toBe(9);
  });

  it("316 − 273 = 43 (caso real, sin ×20 ni ×70)", () => {
    expect(computeLineBalanceAfter(316, "out", 273)).toBe(43);
    expect(inventoryStockAfter(316, -273)).toBe(43);
  });

  it("60 − 10 = 50 pacas", () => {
    expect(computeLineBalanceAfter(60, "out", 10)).toBe(50);
    expect(inventoryStockAfter(60, -10)).toBe(50);
    expect(
      simulateStockAfterLines(60, [
        { product_id: PRODUCT_ID, movement_type: "out", quantity: 10 },
      ]),
    ).toBe(50);
  });

  it("salida en unidades convierte a fracciones de paca", () => {
    expect(
      simulateStockAfterLines(2, [
        {
          product_id: PRODUCT_ID,
          movement_type: "out",
          quantity: 500,
          quantity_unit: "unit",
          packaging: "Paca x500",
        },
      ]),
    ).toBe(1);
    expect(
      computeLineBalanceAfter(2, "out", 50, {
        quantity_unit: "unit",
        packaging: "Paca x500",
      }),
    ).toBe(1.9);
  });

  it("entrada en unidades convierte a fracciones de paca", () => {
    expect(
      simulateStockAfterLines(2, [
        {
          product_id: PRODUCT_ID,
          movement_type: "in",
          quantity: 500,
          quantity_unit: "unit",
          packaging: "Paca x500",
        },
      ]),
    ).toBe(3);
    expect(
      computeLineBalanceAfter(2, "in", 50, {
        quantity_unit: "unit",
        packaging: "Paca x500",
      }),
    ).toBe(2.1);
  });
});

describe("lineStockDelta", () => {
  it("resta la cantidad entera en salida", () => {
    expect(lineStockDelta({ movement_type: "out", quantity: 273 })).toBe(-273);
  });

  it("suma en entrada", () => {
    expect(lineStockDelta({ movement_type: "in", quantity: 10 })).toBe(10);
  });
});

describe("formatMovementQuantityLabel", () => {
  it("entrada/salida 10 = 10 Pacas con Paca x200", () => {
    expect(formatMovementQuantityLabel(10, PACA_X200)).toBe("10 Pacas");
    expect(getInventoryUnitLabel(PACA_X200)).toBe("Paca");
  });

  it("fracción de paca se muestra en rollos, no en 0,88 Pacas", () => {
    expect(formatMovementQuantityLabel(0.88, "Paca x43", "Rollo")).toBe("38 Rollos");
    expect(formatMovementQuantityLabel(38 / 43, "Paca x43", "Rollo")).toBe("38 Rollos");
  });

  it("mezcla pacas enteras y resto en rollos", () => {
    expect(formatMovementQuantityLabel(2.88, "Paca x43", "Rollo")).toBe(
      "2 Pacas y 38 Rollos",
    );
  });
});

describe("getStockDisplayInfo", () => {
  it("Paca x200: cantidad 10 se muestra como 10 Pacas", () => {
    const info = getStockDisplayInfo(10, PACA_X200);
    expect(info.primary).toContain("10");
    expect(info.primary).toContain("Pacas");
  });

  it("Cj x70: muestra 10 Cjs, no divide por 70", () => {
    const info = getStockDisplayInfo(10, CJ_X70);
    expect(info.primary).toContain("10");
    expect(info.primary).toContain("Cj");
    expect(info.primary).not.toMatch(/0[,.]1/);
  });

  it("Paca x200: muestra 316 Pacas tal cual", () => {
    const info = getStockDisplayInfo(316, PACA_X200);
    expect(info.primary).toContain("316");
    expect(info.primary).toContain("Paca");
  });

  it("fracción de paca: 0,88 de Paca x43 = 38 Rollos", () => {
    const info = getStockDisplayInfo(0.88, "Paca x43", "Rollo");
    expect(info.primary).toBe("38 Rollos");
    expect(info.primary).not.toMatch(/0[,.]88/);
  });

  it("Pqt x20: muestra 316 sin dividir por 20", () => {
    const info = getStockDisplayInfo(316, PQT_X20);
    expect(info.primary).toContain("316");
    expect(info.primary).not.toContain("15");
  });
});

describe("parsePackagingConversion", () => {
  it("parsea Cj x70 con factor descriptivo 70", () => {
    const parsed = parsePackagingConversion(CJ_X70);
    expect(parsed?.unitName).toBe("Cj");
    expect(parsed?.factor).toBe(70);
  });

  it("parsea Paca x200", () => {
    const parsed = parsePackagingConversion(PACA_X200);
    expect(parsed?.unitName).toBe("Paca");
    expect(parsed?.factor).toBe(200);
  });
});

describe("buildLinePreviews", () => {
  it("60 pacas − salida 10 = quedan 50", () => {
    const previews = buildLinePreviews(
      [{ product_id: PRODUCT_ID, movement_type: "out", quantity: 10 }],
      { [PRODUCT_ID]: 60 },
    );
    expect(previews[0]?.balanceBefore).toBe(60);
    expect(previews[0]?.balanceAfter).toBe(50);
  });

  it("vista previa Cj x70: 316 → −273 → 43", () => {
    const previews = buildLinePreviews(
      [{ product_id: PRODUCT_ID, movement_type: "out", quantity: 273 }],
      { [PRODUCT_ID]: 316 },
    );
    expect(previews[0]?.balanceBefore).toBe(316);
    expect(previews[0]?.balanceAfter).toBe(43);
  });

  it("entrada 1 cj desde 5 deja 6", () => {
    expect(computeLineBalanceAfter(5, "in", 1)).toBe(6);
  });

  it("marca violación si supera stock", () => {
    const previews = buildLinePreviews(
      [{ product_id: PRODUCT_ID, movement_type: "out", quantity: 400 }],
      { [PRODUCT_ID]: 316 },
    );
    expect(previews[0]?.violates).toBe(true);
  });

  it("480 Cjs − salida 475 = quedan 5 (resta directa, sin ×70)", () => {
    expect(computeLineBalanceAfter(480, "out", 475)).toBe(5);
    expect(lineStockDelta({ movement_type: "out", quantity: 475 })).toBe(-475);
    expect(inventoryStockAfter(480, -475)).toBe(5);
  });

  it("760 Cjs − salida 60 = quedan 700 (Vaso 7 Oz, Cj x70 solo descriptivo)", () => {
    expect(computeLineBalanceAfter(760, "out", 60)).toBe(700);
    expect(
      simulateStockAfterLines(760, [
        { product_id: PRODUCT_ID, movement_type: "out", quantity: 60 },
      ]),
    ).toBe(700);
  });

  it("acumula varias líneas del mismo producto (2× salida 10 → −20)", () => {
    const previews = buildLinePreviews(
      [
        { product_id: PRODUCT_ID, movement_type: "out", quantity: 10 },
        { product_id: PRODUCT_ID, movement_type: "out", quantity: 10 },
      ],
      { [PRODUCT_ID]: 60 },
    );
    expect(previews[0]?.balanceAfter).toBe(50);
    expect(previews[1]?.balanceAfter).toBe(40);
  });
});

describe("validateMovementLine", () => {
  it("permite salida de 1 Cj con stock 10", () => {
    const result = validateMovementLine("out", 1, 10, CJ_X70);
    expect(result.allowed).toBe(true);
  });

  it("rechaza salida mayor al stock en cajas", () => {
    const result = validateMovementLine("out", 11, 10, CJ_X70);
    expect(result.allowed).toBe(false);
  });
});

describe("sumStockDeltasByProduct", () => {
  it("agrupa deltas por producto", () => {
    const map = sumStockDeltasByProduct([
      { product_id: PRODUCT_ID, movement_type: "out", quantity: 30 },
      { product_id: PRODUCT_ID, movement_type: "in", quantity: 5 },
    ]);
    expect(map.get(PRODUCT_ID)).toBe(-25);
  });
});
