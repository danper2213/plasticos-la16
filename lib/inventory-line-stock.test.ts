import { describe, expect, it } from "vitest";
import { buildUnitMovementNote, toStockUnitLines } from "./inventory-line-stock";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const packagingById = { [PRODUCT_ID]: "Paca x500" };
const presentationById = { [PRODUCT_ID]: "Tula" };

describe("toStockUnitLines", () => {
  it("entrada por unidad: 50 tulas = 0.1 paca", () => {
    const [line] = toStockUnitLines(
      [
        {
          product_id: PRODUCT_ID,
          movement_type: "in",
          quantity: 50,
          quantity_unit: "unit",
        },
      ],
      packagingById,
    );
    expect(line?.quantity).toBe(0.1);
    expect(line?.movement_type).toBe("in");
  });
});

describe("buildUnitMovementNote", () => {
  it("anota entrada por unidad", () => {
    const note = buildUnitMovementNote(
      [
        {
          product_id: PRODUCT_ID,
          movement_type: "in",
          quantity: 50,
          quantity_unit: "unit",
        },
      ],
      packagingById,
      presentationById,
    );
    expect(note).toBe("Entrada por unidad: 50 Tulas");
  });

  it("anota salida por unidad", () => {
    const note = buildUnitMovementNote(
      [
        {
          product_id: PRODUCT_ID,
          movement_type: "out",
          quantity: 50,
          quantity_unit: "unit",
        },
      ],
      packagingById,
      presentationById,
    );
    expect(note).toBe("Salida por unidad: 50 Tulas");
  });

  it("combina entrada y salida en el mismo lote", () => {
    const note = buildUnitMovementNote(
      [
        {
          product_id: PRODUCT_ID,
          movement_type: "in",
          quantity: 50,
          quantity_unit: "unit",
        },
        {
          product_id: PRODUCT_ID,
          movement_type: "out",
          quantity: 100,
          quantity_unit: "unit",
        },
      ],
      packagingById,
      presentationById,
    );
    expect(note).toBe(
      "Entrada por unidad: 50 Tulas · Salida por unidad: 100 Tulas",
    );
  });

  it("ignora líneas en paca", () => {
    expect(
      buildUnitMovementNote(
        [
          {
            product_id: PRODUCT_ID,
            movement_type: "in",
            quantity: 2,
            quantity_unit: "pack",
          },
        ],
        packagingById,
        presentationById,
      ),
    ).toBeNull();
  });
});
