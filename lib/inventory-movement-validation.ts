import { formatMovementQuantityLabel } from "@/lib/inventory-stock-display";

export type MovementLineValidation = {
  allowed: boolean;
  reason?: string;
  severity: "ok" | "error" | "warning";
};

/** Valida si una línea de movimiento es viable contra el saldo simulado. */
export function validateMovementLine(
  movementType: string,
  quantityBase: number,
  balanceBefore: number,
  packaging: string | null | undefined,
  presentation?: string | null,
): MovementLineValidation {
  if (!Number.isFinite(quantityBase) || quantityBase <= 0) {
    return {
      allowed: false,
      reason: "Indicá una cantidad mayor que 0",
      severity: "warning",
    };
  }

  if (movementType === "out") {
    if (balanceBefore <= 0) {
      return {
        allowed: false,
        reason: "No hay stock en bodega para registrar una salida",
        severity: "error",
      };
    }

    if (quantityBase > balanceBefore + 1e-9) {
      const available = formatMovementQuantityLabel(
        balanceBefore,
        packaging,
        presentation,
      );
      const requested = formatMovementQuantityLabel(
        quantityBase,
        packaging,
        presentation,
      );
      return {
        allowed: false,
        reason: `No podés sacar ${requested}: solo hay ${available} disponible`,
        severity: "error",
      };
    }

    return {
      allowed: true,
      reason: "Salida permitida según el stock en bodega",
      severity: "ok",
    };
  }

  return { allowed: true, severity: "ok" };
}
