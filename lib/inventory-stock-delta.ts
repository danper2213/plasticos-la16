/** Efecto de una línea de movimiento sobre `products.stock_quantity` (unidades base). */
export function lineStockDelta(line: { movement_type: string; quantity: number }): number {
  if (line.movement_type === "out") return -line.quantity;
  if (line.movement_type === "in") return line.quantity;
  // adjustment: en el formulario la cantidad es siempre positiva y se trata como ajuste al alza
  return line.quantity;
}
