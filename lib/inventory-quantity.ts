/** Precisión al guardar cantidades de inventario / stock (evita ruido float). */
export const INVENTORY_QTY_MAX_DECIMALS = 6;

const MIN_POSITIVE = 1e-9;

/** Convierte stock/cantidad de BD o formulario a número (Supabase numeric puede venir como string). */
export function toStockNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function normalizeInventoryQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= MIN_POSITIVE) return 0;
  return Number(value.toFixed(INVENTORY_QTY_MAX_DECIMALS));
}

export function formatInventoryQuantity(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: INVENTORY_QTY_MAX_DECIMALS,
  });
}
