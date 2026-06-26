import { parsePackagingConversion } from "@/lib/parse-packaging";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";

function pluralizePackagingUnit(unitName: string, count: number): string {
  if (Math.abs(count - 1) < 1e-9) return unitName;
  if (unitName === "Caja madre") return "Cajas madre";
  if (unitName === "Caja") return "Cajas";
  if (unitName === "Paca") return "Pacas";
  if (unitName === "Pqt") return "Pqt";
  if (unitName === "Cj") return "Cjs";
  if (unitName === "Unidad") return "Unidades";
  return `${unitName}s`;
}

function formatPackCount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value - Math.round(value)) < 1e-6) {
    return formatInventoryQuantity(Math.round(value));
  }
  return formatInventoryQuantity(Number(value.toFixed(2)));
}

export type StockDisplayInfo = {
  primary: string;
  hasLargeUnit: boolean;
  unitName?: string;
  baseQuantity: number;
};

/** Texto del empaque tal como está en el producto (ej. "Paca x200", "Cj x70"). */
export function formatPackagingDescriptor(
  packaging: string | null | undefined,
): string | null {
  const raw = typeof packaging === "string" ? packaging.trim() : "";
  return raw || null;
}

/** Unidad de inventario para movimientos (ej. "Paca", "Cj"). */
export function getInventoryUnitLabel(packaging: string | null | undefined): string {
  const parsed = parsePackagingConversion(packaging);
  return parsed?.unitName ?? "unidades";
}

/**
 * Muestra stock en cajas/pacas si hay empaque parseable;
 * si no hay empaque, usa unidades genéricas (no presentación comercial).
 */
export function getStockDisplayInfo(
  quantity: number | null | undefined,
  packaging: string | null | undefined,
): StockDisplayInfo {
  if (quantity === null || quantity === undefined) {
    return {
      primary: "Sin saldo cargado",
      hasLargeUnit: false,
      baseQuantity: 0,
    };
  }

  const parsed = parsePackagingConversion(packaging);
  if (!parsed) {
    const plural =
      Math.abs(quantity - 1) < 1e-9 ? "unidad" : "unidades";
    return {
      primary: `${formatInventoryQuantity(quantity)} ${plural}`,
      hasLargeUnit: false,
      baseQuantity: quantity,
    };
  }

  /** Cantidad en cajas/pacas; el x70/x200 del empaque no modifica este número. */
  return {
    primary: `${formatPackCount(quantity)} ${pluralizePackagingUnit(parsed.unitName, quantity)}`,
    hasLargeUnit: true,
    unitName: parsed.unitName,
    baseQuantity: quantity,
  };
}

/** Convierte cantidad en unidad de inventario a texto con empaque grande, o null si no aplica. */
export function formatQuantityInLargePackaging(
  quantity: number,
  packaging: string | null | undefined,
): string | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed) return null;
  if (quantity < 0.001) return null;
  return `${formatPackCount(quantity)} ${pluralizePackagingUnit(parsed.unitName, quantity)}`;
}

/** Etiqueta de cantidad en la unidad del empaque (pacas, cajas…). */
export function formatMovementQuantityLabel(
  quantity: number,
  packaging: string | null | undefined,
): string {
  const large = formatQuantityInLargePackaging(quantity, packaging);
  if (large) return large;
  const plural =
    Math.abs(quantity - 1) < 1e-9 ? "unidad" : "unidades";
  return `${formatInventoryQuantity(quantity)} ${plural}`;
}

export { pluralizePackagingUnit, formatPackCount };
