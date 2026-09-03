import { describe, expect, it } from "vitest";
import {
  INVENTORY_RECEIPT_RETENTION_DAYS,
  inventoryReceiptCutoffIso,
} from "./inventory-receipt-retention";

describe("inventoryReceiptCutoffIso", () => {
  it("resta 30 días", () => {
    const now = new Date("2026-10-02T15:00:00.000Z");
    const cutoff = new Date(inventoryReceiptCutoffIso(now));
    const diffDays = (now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(INVENTORY_RECEIPT_RETENTION_DAYS);
  });
});
