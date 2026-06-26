/**
 * Convención de inventario (Plásticos La 16)
 * -----------------------------------------
 * - Stock en BD = cantidad de cajas/pacas COMPLETAS (unidad del empaque).
 * - Movimientos = misma unidad: entrada de 1 Cj resta/suma 1, no 70.
 * - El texto "Cj x70" o "Paca x200" describe cuánto trae cada unidad;
 *   el 70 o 200 NUNCA se usa para dividir, multiplicar ni restar stock.
 */

import { parsePackagingConversion } from "@/lib/parse-packaging";

/** True si el producto tiene empaque parseable (Cj, Paca, Caja…). */
export function usesLargeUnitInventory(
  packaging: string | null | undefined,
): boolean {
  return Boolean(parsePackagingConversion(packaging));
}

export function getLargeUnitName(packaging: string | null | undefined): string | null {
  const parsed = parsePackagingConversion(packaging);
  return parsed?.unitName ?? null;
}

import { toStockNumber } from "@/lib/inventory-quantity";

/** Saldo en cajas/pacas tras un delta (+entrada, −salida). Sin factor de empaque. */
export function inventoryStockAfter(
  current: number | null | undefined,
  delta: number,
): number {
  const base = toStockNumber(current);
  const change = toStockNumber(delta);
  return Math.max(0, base + change);
}
