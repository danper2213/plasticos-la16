import type { MovementLineInput } from "@/lib/inventory-movement-preview";
import {
  formatQuantityInUnit,
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

function formatUnitLinePart(
  line: LineWithUnit,
  packagingByProductId: Record<string, string | null | undefined>,
  presentationByProductId?: Record<string, string | null | undefined>,
): string {
  const packaging = packagingByProductId[line.product_id] ?? null;
  const presentation = presentationByProductId?.[line.product_id] ?? null;
  return formatQuantityInUnit(
    line.quantity,
    "unit",
    packaging,
    presentation,
  );
}

/**
 * Nota legible cuando entrada o salida se registró en unidades sueltas.
 * El stock persistido sigue en pacas/cajas.
 */
export function buildUnitMovementNote(
  lines: LineWithUnit[],
  packagingByProductId: Record<string, string | null | undefined>,
  presentationByProductId?: Record<string, string | null | undefined>,
): string | null {
  const inParts: string[] = [];
  const outParts: string[] = [];
  for (const line of lines) {
    if (line.quantity_unit !== "unit") continue;
    if (line.movement_type !== "in" && line.movement_type !== "out") continue;
    const part = formatUnitLinePart(
      line,
      packagingByProductId,
      presentationByProductId,
    );
    if (line.movement_type === "in") inParts.push(part);
    else outParts.push(part);
  }
  const segments: string[] = [];
  if (inParts.length > 0) {
    segments.push(`Entrada por unidad: ${inParts.join("; ")}`);
  }
  if (outParts.length > 0) {
    segments.push(`Salida por unidad: ${outParts.join("; ")}`);
  }
  return segments.length > 0 ? segments.join(" · ") : null;
}
