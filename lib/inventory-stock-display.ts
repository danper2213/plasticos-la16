import { parsePackagingConversion } from "@/lib/parse-packaging";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";

function pluralizePackagingUnit(unitName: string, count: number): string {
  if (Math.abs(count - 1) < 1e-9) return unitName;
  if (unitName === "Caja madre") return "Cajas madre";
  if (unitName === "Caja") return "Cajas";
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
  factor?: number;
  baseQuantity: number;
};

/**
 * Muestra stock en presentación grande (ej. "8 Cajas") si hay empaque;
 * si no, solo en unidades base (ej. "560 unidades").
 */
export function getStockDisplayInfo(
  quantity: number | null | undefined,
  packaging: string | null | undefined,
  presentation?: string | null,
): StockDisplayInfo {
  if (quantity === null || quantity === undefined) {
    return {
      primary: "Sin saldo cargado",
      hasLargeUnit: false,
      baseQuantity: 0,
    };
  }

  const parsed = parsePackagingConversion(packaging);
  if (!parsed || parsed.factor <= 1) {
    const baseName = presentation?.trim() || "unidades";
    const plural =
      Math.abs(quantity - 1) < 1e-9
        ? baseName
        : baseName.endsWith("s")
          ? baseName
          : `${baseName}s`;
    return {
      primary: `${formatInventoryQuantity(quantity)} ${plural}`,
      hasLargeUnit: false,
      baseQuantity: quantity,
    };
  }

  const count = quantity / parsed.factor;
  return {
    primary: `${formatPackCount(count)} ${pluralizePackagingUnit(parsed.unitName, count)}`,
    hasLargeUnit: true,
    unitName: parsed.unitName,
    factor: parsed.factor,
    baseQuantity: quantity,
  };
}

/** Convierte cantidad base a texto en presentación grande, o null si no aplica. */
export function formatQuantityInLargePackaging(
  quantityBase: number,
  packaging: string | null | undefined,
): string | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed || parsed.factor <= 1) return null;
  if (quantityBase < 0.001) return null;
  const count = quantityBase / parsed.factor;
  return `${formatPackCount(count)} ${pluralizePackagingUnit(parsed.unitName, count)}`;
}

/** Etiqueta corta de cantidad en la unidad de entrada del movimiento. */
export function formatMovementQuantityLabel(
  quantityBase: number,
  packaging: string | null | undefined,
  presentation?: string | null,
): string {
  const large = formatQuantityInLargePackaging(quantityBase, packaging);
  if (large) return large;
  const baseName = presentation?.trim() || "unidades";
  const plural =
    Math.abs(quantityBase - 1) < 1e-9
      ? baseName
      : baseName.endsWith("s")
        ? baseName
        : `${baseName}s`;
  return `${formatInventoryQuantity(quantityBase)} ${plural}`;
}

export { pluralizePackagingUnit, formatPackCount };
