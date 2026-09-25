import { describe, expect, it } from "vitest";
import { computeDailyRegister, cuadreTone } from "./calc";

describe("computeDailyRegister", () => {
  it("cuadra cuando efectivo y transferencias son las ventas menos gastos y pagos", () => {
    const derived = computeDailyRegister({
      previous_balance: 100_000,
      samit_sales_total: 1_000_000,
      cash_total: 400_000,
      transfers_total: 300_000,
      expenses_total: 100_000,
      payments_total: 200_000,
    });

    expect(derived.collected).toBe(700_000);
    expect(derived.expectedCollected).toBe(700_000);
    expect(derived.samitDifference).toBe(0);
    expect(derived.endingBalance).toBe(500_000);
    expect(cuadreTone(derived.samitDifference)).toBe("ok");
  });

  it("marca falta si entró menos de lo que debía quedar", () => {
    const derived = computeDailyRegister({
      previous_balance: 0,
      samit_sales_total: 1_000_000,
      cash_total: 400_000,
      transfers_total: 200_000,
      expenses_total: 50_000,
      payments_total: 50_000,
    });

    expect(derived.expectedCollected).toBe(900_000);
    expect(derived.samitDifference).toBe(300_000);
    expect(cuadreTone(derived.samitDifference)).toBe("short");
  });

  it("marca sobra si entró más que las ventas menos gastos y pagos", () => {
    const derived = computeDailyRegister({
      previous_balance: 0,
      samit_sales_total: 500_000,
      cash_total: 400_000,
      transfers_total: 200_000,
      expenses_total: 50_000,
      payments_total: 50_000,
    });

    expect(derived.expectedCollected).toBe(400_000);
    expect(derived.samitDifference).toBe(-200_000);
    expect(cuadreTone(derived.samitDifference)).toBe("over");
  });
});
