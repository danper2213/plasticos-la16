import { toStockNumber } from "@/lib/inventory-quantity";

export type RotationMovementRow = {
  product_id: string;
  quantity: number;
  movement_date?: string | null;
  batch_id?: string | null;
};

export type ProductRotationAggregate = {
  productId: string;
  quantityOut: number;
  outEvents: number;
  /** Días distintos con al menos una salida. */
  distinctDays: number;
};

/**
 * Agrega salidas por producto (cantidad en unidades de stock + frecuencia).
 * Entrada: solo filas ya filtradas a movement_type = 'out'.
 */
export function aggregateProductRotation(
  rows: RotationMovementRow[],
): ProductRotationAggregate[] {
  const map = new Map<
    string,
    {
      quantityOut: number;
      outEvents: number;
      days: Set<string>;
    }
  >();

  for (const row of rows) {
    const productId = row.product_id?.trim();
    if (!productId) continue;
    const qty = toStockNumber(row.quantity);
    if (qty <= 0) continue;

    let bucket = map.get(productId);
    if (!bucket) {
      bucket = { quantityOut: 0, outEvents: 0, days: new Set() };
      map.set(productId, bucket);
    }
    bucket.quantityOut += qty;
    bucket.outEvents += 1;
    const day = (row.movement_date ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) bucket.days.add(day);
  }

  return [...map.entries()]
    .map(([productId, b]) => ({
      productId,
      quantityOut: Number(b.quantityOut.toFixed(6)),
      outEvents: b.outEvents,
      distinctDays: b.days.size,
    }))
    .sort((a, b) => {
      if (b.quantityOut !== a.quantityOut) return b.quantityOut - a.quantityOut;
      return b.outEvents - a.outEvents;
    });
}
