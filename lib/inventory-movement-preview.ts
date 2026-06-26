import { lineStockDelta } from "@/lib/inventory-stock-delta";
import { toStockNumber } from "@/lib/inventory-quantity";
import { inventoryStockAfter } from "@/lib/inventory-units";

export type MovementLineInput = {
  product_id: string;
  movement_type: string;
  quantity: number;
};

export type LinePreview = {
  balanceBefore: number;
  balanceAfter: number;
  violates: boolean;
};

export function parseLineQuantity(quantity: unknown): number {
  return toStockNumber(quantity);
}

/** Saldo después de una línea en pacas/cajas (sin conversiones por factor de empaque). */
export function computeLineBalanceAfter(
  balanceBefore: number,
  movementType: string,
  quantity: unknown,
): number {
  return (
    balanceBefore +
    lineStockDelta({
      movement_type: movementType,
      quantity: parseLineQuantity(quantity),
    })
  );
}

export function buildLinePreviews(
  lines: MovementLineInput[],
  stockByProductId: Record<string, number | null | undefined>,
): LinePreview[] {
  const running = new Map<string, number>();

  return lines.map((line) => {
    if (!line.product_id) {
      return { balanceBefore: 0, balanceAfter: 0, violates: false };
    }

    if (!running.has(line.product_id)) {
      running.set(line.product_id, toStockNumber(stockByProductId[line.product_id]));
    }

    const before = running.get(line.product_id)!;
    const after = computeLineBalanceAfter(
      before,
      line.movement_type,
      line.quantity,
    );
    running.set(line.product_id, after);

    return {
      balanceBefore: before,
      balanceAfter: after,
      violates: after < -1e-9,
    };
  });
}

/** Simula el saldo final en BD tras aplicar varias líneas (misma lógica que el servidor). */
export function simulateStockAfterLines(
  initialStock: number | null | undefined,
  lines: MovementLineInput[],
): number {
  let balance = initialStock ?? 0;
  for (const line of lines) {
    balance = inventoryStockAfter(
      balance,
      lineStockDelta({
        movement_type: line.movement_type,
        quantity: parseLineQuantity(line.quantity),
      }),
    );
  }
  return balance;
}

/** Suma de deltas por producto para persistir stock. */
export function sumStockDeltasByProduct(
  lines: MovementLineInput[],
): Map<string, number> {
  const deltaByProduct = new Map<string, number>();
  for (const line of lines) {
    if (!line.product_id) continue;
    const d = lineStockDelta({
      movement_type: line.movement_type,
      quantity: parseLineQuantity(line.quantity),
    });
    deltaByProduct.set(
      line.product_id,
      (deltaByProduct.get(line.product_id) ?? 0) + d,
    );
  }
  return deltaByProduct;
}
