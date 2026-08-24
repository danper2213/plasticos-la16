import {
  lineQuantityInStockUnits,
  type MovementLineInput,
} from "@/lib/inventory-movement-preview";
import {
  formatQuantityInUnit,
  getPackUnitLabel,
  quantityToStockUnits,
  type QuantityUnit,
} from "@/lib/inventory-quantity-unit";
import { normalizeInventoryQuantity } from "@/lib/inventory-quantity";

type LineWithUnit = {
  product_id: string;
  movement_type: string;
  quantity: number;
  quantity_unit?: QuantityUnit | null;
  historical_unit_cost?: number;
};

/** Enriquece líneas con packaging para previews / validación. */
export function attachPackagingToLines(
  lines: LineWithUnit[],
  packagingByProductId: Record<string, string | null | undefined>,
): MovementLineInput[] {
  return lines.map((line) => ({
    product_id: line.product_id,
    movement_type: line.movement_type,
    quantity: line.quantity,
    quantity_unit: line.quantity_unit ?? "pack",
    packaging: packagingByProductId[line.product_id] ?? null,
  }));
}

/**
 * Convierte cantidades del formulario a unidades de stock (pacas/cajas)
 * para persistir y aplicar deltas.
 */
export function toStockUnitLines<T extends LineWithUnit>(
  lines: T[],
  packagingByProductId: Record<string, string | null | undefined>,
): Array<Omit<T, "quantity_unit"> & { quantity: number }> {
  return lines.map((line) => {
    const packaging = packagingByProductId[line.product_id] ?? null;
    const stockQty = quantityToStockUnits(
      line.quantity,
      line.quantity_unit ?? "pack",
      packaging,
    );
    const { quantity_unit: _u, ...rest } = line;
    return {
      ...rest,
      quantity: normalizeInventoryQuantity(stockQty),
    };
  });
}

/** Nota legible cuando la salida fue en unidades sueltas. */
export function buildUnitExitNote(
  lines: LineWithUnit[],
  packagingByProductId: Record<string, string | null | undefined>,
  presentationByProductId?: Record<string, string | null | undefined>,
): string | null {
  const parts: string[] = [];
  for (const line of lines) {
    if (line.movement_type !== "out") continue;
    if (line.quantity_unit !== "unit") continue;
    const packaging = packagingByProductId[line.product_id] ?? null;
    const presentation = presentationByProductId?.[line.product_id] ?? null;
    const stockQty = lineQuantityInStockUnits({
      product_id: line.product_id,
      movement_type: line.movement_type,
      quantity: line.quantity,
      quantity_unit: "unit",
      packaging,
    });
    const entered = formatQuantityInUnit(
      line.quantity,
      "unit",
      packaging,
      presentation,
    );
    const asPack = formatQuantityInUnit(
      stockQty,
      "pack",
      packaging,
      presentation,
    );
    parts.push(`${entered} → ${asPack} (${getPackUnitLabel(packaging)} stock)`);
  }
  if (parts.length === 0) return null;
  return `Salida por unidad: ${parts.join("; ")}`;
}
