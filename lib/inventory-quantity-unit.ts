/**
 * Unidad de cantidad en movimientos de inventario.
 * - pack: cajas/pacas (unidad de stock en BD)
 * - unit: unidades sueltas / presentación (tula, paquete…) → se convierte con el factor del empaque
 */

import { parsePackagingConversion } from "@/lib/parse-packaging";
import { normalizeInventoryQuantity, toStockNumber } from "@/lib/inventory-quantity";

export const QUANTITY_UNITS = ["pack", "unit"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export type MovementUnitOption = {
  value: QuantityUnit;
  /** Etiqueta corta para el botón (ej. "Paca", "Tula"). */
  label: string;
  /** Texto de ayuda. */
  hint?: string;
};

function cleanLabel(value: string | null | undefined): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  return t || null;
}

/** Factor del empaque (ej. 500 en "Paca x500"). null si no hay empaque grande. */
export function getPackagingFactor(
  packaging: string | null | undefined,
): number | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed || !(parsed.factor > 0)) return null;
  return parsed.factor;
}

/** Nombre de la unidad grande (Paca, Cj…). */
export function getPackUnitLabel(
  packaging: string | null | undefined,
): string {
  return parsePackagingConversion(packaging)?.unitName ?? "Paca";
}

/**
 * Etiqueta de la unidad suelta / presentación.
 * Prioriza presentation del producto (ej. "Tula").
 */
export function getLooseUnitLabel(
  packaging: string | null | undefined,
  presentation?: string | null,
): string {
  const fromPresentation = cleanLabel(presentation);
  if (fromPresentation) {
    // Si presentation es "Paquete x20", tomar la primera palabra útil
    const first = fromPresentation.split(/\s+[x×]/i)[0]?.trim();
    if (first) return first;
    return fromPresentation;
  }
  const parsed = parsePackagingConversion(packaging);
  if (parsed?.baseLabel) return parsed.baseLabel;
  return "unidad";
}

/** Opciones de presentación (entrada/salida) según empaque del producto. */
export function resolveExitUnitOptions(
  packaging: string | null | undefined,
  presentation?: string | null,
): MovementUnitOption[] {
  const factor = getPackagingFactor(packaging);
  const packLabel = getPackUnitLabel(packaging);
  const unitLabel = getLooseUnitLabel(packaging, presentation);

  if (factor != null && factor > 1) {
    return [
      {
        value: "pack",
        label: packLabel,
        hint: `1 ${packLabel} = 1 en stock`,
      },
      {
        value: "unit",
        label: unitLabel,
        hint: `${factor} ${unitLabel}${factor === 1 ? "" : "s"} = 1 ${packLabel}`,
      },
    ];
  }

  // Sin empaque grande: solo unidades (stock ya está en esa unidad)
  return [
    {
      value: "unit",
      label: unitLabel === "unidad" ? "Unidad" : unitLabel,
      hint: "1 unidad = 1 en stock",
    },
  ];
}

export function defaultQuantityUnit(
  packaging: string | null | undefined,
): QuantityUnit {
  const factor = getPackagingFactor(packaging);
  return factor != null && factor > 1 ? "pack" : "unit";
}

/**
 * Convierte la cantidad del formulario a unidades de stock (pacas/cajas).
 * unit → quantity / factor; pack → quantity.
 */
export function quantityToStockUnits(
  quantity: number,
  quantityUnit: QuantityUnit | null | undefined,
  packaging: string | null | undefined,
): number {
  const qty = toStockNumber(quantity);
  if (qty <= 0) return 0;

  const unit: QuantityUnit = quantityUnit === "unit" ? "unit" : "pack";
  if (unit === "pack") {
    return normalizeInventoryQuantity(qty);
  }

  const factor = getPackagingFactor(packaging);
  if (factor == null || factor <= 0) {
    // Sin factor: stock y cantidad van 1:1
    return normalizeInventoryQuantity(qty);
  }

  return normalizeInventoryQuantity(qty / factor);
}

/** Cantidad máxima que se puede sacar en la unidad elegida, dado el stock en pacas. */
export function maxOutInQuantityUnit(
  stockPacks: number,
  quantityUnit: QuantityUnit | null | undefined,
  packaging: string | null | undefined,
): number {
  const stock = Math.max(0, toStockNumber(stockPacks));
  const unit: QuantityUnit = quantityUnit === "unit" ? "unit" : "pack";
  if (unit === "pack") return stock;

  const factor = getPackagingFactor(packaging);
  if (factor == null || factor <= 0) return stock;
  return normalizeInventoryQuantity(stock * factor);
}

/** Etiqueta de cantidad en la unidad elegida (UI). */
export function formatQuantityInUnit(
  quantity: number,
  quantityUnit: QuantityUnit | null | undefined,
  packaging: string | null | undefined,
  presentation?: string | null,
): string {
  const qty = toStockNumber(quantity);
  const unit: QuantityUnit = quantityUnit === "unit" ? "unit" : "pack";
  if (unit === "unit") {
    const label = getLooseUnitLabel(packaging, presentation);
    const plural =
      Math.abs(qty - 1) < 1e-9
        ? label
        : label.toLowerCase() === "unidad"
          ? "unidades"
          : `${label}s`;
    return `${qty.toLocaleString("es-CO", { maximumFractionDigits: 6 })} ${plural}`;
  }
  const packLabel = getPackUnitLabel(packaging);
  const plural =
    Math.abs(qty - 1) < 1e-9
      ? packLabel
      : packLabel === "Paca"
        ? "Pacas"
        : packLabel === "Cj"
          ? "Cjs"
          : packLabel === "Caja"
            ? "Cajas"
            : `${packLabel}s`;
  return `${qty.toLocaleString("es-CO", { maximumFractionDigits: 6 })} ${plural}`;
}
