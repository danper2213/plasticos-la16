export type InvoiceCostDelta = "increase" | "decrease" | "same" | "none";

export function invoiceCostDelta(
  currentCost: number | null,
  unitCost: number,
): InvoiceCostDelta {
  if (currentCost == null) return "none";
  if (unitCost > currentCost) return "increase";
  if (unitCost < currentCost) return "decrease";
  return "same";
}

/**
 * Por defecto solo se aplica el costo de factura cuando es estrictamente
 * mayor al de catálogo. Las bajas quedan a decisión del usuario.
 */
export function defaultApplyCostUpdate(
  currentCost: number | null,
  unitCost: number,
): boolean {
  return invoiceCostDelta(currentCost, unitCost) === "increase";
}
