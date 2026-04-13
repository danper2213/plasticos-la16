/** Precio unitario sugerido = costo × (1 + utilidad%/100), redondeado a COP. */
export function unitPriceFromCostAndUtilityPercent(cost: number, utilityPercent: number): number {
  return Math.round(Math.max(0, cost) * (1 + utilityPercent / 100));
}

/** Subtotal de línea: precio unitario cotizado × cantidad. */
export function quoteLineTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
