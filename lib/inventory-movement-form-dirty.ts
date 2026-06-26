import type { BatchInventoryMovementFormValues } from "@/app/dashboard/inventory/schema";

function isLineDirty(
  line: BatchInventoryMovementFormValues["lines"][number],
  index: number,
): boolean {
  if (line.product_id) return true;
  if (line.movement_type !== "in") return true;
  if (line.historical_unit_cost !== 0) return true;
  if (index === 0 && line.quantity !== 1) return true;
  if (index > 0) return true;
  return false;
}

/** True when the user entered data that would be lost on close. */
export function isMovementFormDirty(values: BatchInventoryMovementFormValues): boolean {
  if ((values.global_notes ?? "").trim().length > 0) return true;
  if (values.lines.length > 1) return true;
  return values.lines.some((line, index) => isLineDirty(line, index));
}
