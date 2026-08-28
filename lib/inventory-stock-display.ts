import { parsePackagingConversion } from "@/lib/parse-packaging";
import { formatInventoryQuantity, toStockNumber } from "@/lib/inventory-quantity";
import { getLooseUnitLabel } from "@/lib/inventory-quantity-unit";

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

function formatLooseUnitCount(
  count: number,
  packaging: string | null | undefined,
  presentation?: string | null,
): string {
  const label = getLooseUnitLabel(packaging, presentation);
  const plural =
    Math.abs(count - 1) < 1e-9
      ? label
      : label.toLowerCase() === "unidad"
        ? "unidades"
        : `${label}s`;
  return `${formatInventoryQuantity(count)} ${plural}`;
}

/**
 * Parte el stock en pacas enteras + resto en presentación (rollos, tulas…).
 * Evita mostrar "0,88 Pacas": 38/43 de paca → 38 rollos.
 */
export function splitStockPacksAndLooseUnits(
  stockPacks: number,
  packaging: string | null | undefined,
): { packs: number; units: number; factor: number } | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed || !(parsed.factor > 1)) return null;
  const totalLoose = Math.round(toStockNumber(stockPacks) * parsed.factor);
  if (totalLoose < 0) return { packs: 0, units: 0, factor: parsed.factor };
  const packs = Math.floor(totalLoose / parsed.factor);
  const units = totalLoose - packs * parsed.factor;
  return { packs, units, factor: parsed.factor };
}

/** Etiqueta de stock/cantidad: pacas enteras y, si hay resto, unidades sueltas. */
export function formatStockQuantityLabel(
  quantity: number,
  packaging: string | null | undefined,
  presentation?: string | null,
): string {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed) {
    const plural = Math.abs(quantity - 1) < 1e-9 ? "unidad" : "unidades";
    return `${formatInventoryQuantity(quantity)} ${plural}`;
  }

  const split = splitStockPacksAndLooseUnits(quantity, packaging);
  if (split) {
    const parts: string[] = [];
    if (split.packs > 0) {
      parts.push(
        `${formatPackCount(split.packs)} ${pluralizePackagingUnit(parsed.unitName, split.packs)}`,
      );
    }
    if (split.units > 0) {
      parts.push(formatLooseUnitCount(split.units, packaging, presentation));
    }
    if (parts.length > 0) return parts.join(" y ");
  }

  return `${formatPackCount(quantity)} ${pluralizePackagingUnit(parsed.unitName, quantity)}`;
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
 * Muestra stock en cajas/pacas enteras; el resto del empaque va en presentación
 * (ej. 0,88 de Paca x43 → "38 Rollos").
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
  if (!parsed) {
    const plural = Math.abs(quantity - 1) < 1e-9 ? "unidad" : "unidades";
    return {
      primary: `${formatInventoryQuantity(quantity)} ${plural}`,
      hasLargeUnit: false,
      baseQuantity: quantity,
    };
  }

  return {
    primary: formatStockQuantityLabel(quantity, packaging, presentation),
    hasLargeUnit: true,
    unitName: parsed.unitName,
    baseQuantity: quantity,
  };
}

/** Convierte cantidad en unidad de inventario a texto con empaque grande, o null si no aplica. */
export function formatQuantityInLargePackaging(
  quantity: number,
  packaging: string | null | undefined,
  presentation?: string | null,
): string | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed) return null;
  if (quantity < 0.001) return null;
  return formatStockQuantityLabel(quantity, packaging, presentation);
}

/** Etiqueta de cantidad en la unidad del empaque (pacas enteras + resto en rollos/tulas). */
export function formatMovementQuantityLabel(
  quantity: number,
  packaging: string | null | undefined,
  presentation?: string | null,
): string {
  const large = formatQuantityInLargePackaging(quantity, packaging, presentation);
  if (large) return large;
  const plural = Math.abs(quantity - 1) < 1e-9 ? "unidad" : "unidades";
  return `${formatInventoryQuantity(quantity)} ${plural}`;
}

export { pluralizePackagingUnit, formatPackCount };
