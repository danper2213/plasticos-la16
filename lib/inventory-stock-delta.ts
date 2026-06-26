/**
 * Delta de stock en cajas/pacas completas.
 * Salida 475 → resta 475 cajas. Nunca ×70 ni ÷20 del empaque.
 */
export function lineStockDelta(line: { movement_type: string; quantity: number }): number {
  if (line.movement_type === "out") return -line.quantity;
  if (line.movement_type === "in") return line.quantity;
  return line.quantity;
}
