import { describe, expect, it } from "vitest";
import { aggregateProductRotation } from "./inventory-product-rotation";

describe("aggregateProductRotation", () => {
  it("suma cantidad y cuenta eventos por producto", () => {
    const result = aggregateProductRotation([
      { product_id: "a", quantity: 10, movement_date: "2026-08-01" },
      { product_id: "a", quantity: 5, movement_date: "2026-08-01" },
      { product_id: "b", quantity: 20, movement_date: "2026-08-02" },
      { product_id: "a", quantity: 1, movement_date: "2026-08-03" },
    ]);

    expect(result[0]).toMatchObject({
      productId: "b",
      quantityOut: 20,
      outEvents: 1,
      distinctDays: 1,
    });
    expect(result[1]).toMatchObject({
      productId: "a",
      quantityOut: 16,
      outEvents: 3,
      distinctDays: 2,
    });
  });

  it("ignora cantidades no positivas", () => {
    expect(
      aggregateProductRotation([
        { product_id: "a", quantity: 0 },
        { product_id: "a", quantity: -2 },
      ]),
    ).toEqual([]);
  });
});
