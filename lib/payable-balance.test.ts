import { describe, expect, it } from "vitest";
import {
  getPayablePaymentStatus,
  isPayableFullyPaid,
  payableBalanceDue,
  payableStatusLabel,
} from "@/lib/payable-balance";

describe("payableBalanceDue", () => {
  it("resta los abonos del valor de la factura", () => {
    expect(payableBalanceDue(1_000_000, 400_000)).toBe(600_000);
  });

  it("no deja saldo negativo", () => {
    expect(payableBalanceDue(100, 150)).toBe(0);
  });
});

describe("isPayableFullyPaid", () => {
  it("marca pagada cuando el abono cubre el total", () => {
    expect(isPayableFullyPaid(500_000, 500_000)).toBe(true);
    expect(isPayableFullyPaid(500_000, 200_000)).toBe(false);
  });
});

describe("getPayablePaymentStatus", () => {
  it("distingue pendiente, abono y pagada", () => {
    expect(getPayablePaymentStatus({ status: "pending", amount_paid_total: 0 })).toBe(
      "pending",
    );
    expect(
      getPayablePaymentStatus({ status: "pending", amount_paid_total: 50_000 }),
    ).toBe("partial");
    expect(getPayablePaymentStatus({ status: "paid", amount_paid_total: 50_000 })).toBe(
      "paid",
    );
    expect(payableStatusLabel("partial")).toBe("Abono parcial");
  });
});
