import { z } from "zod";
import { toStockNumber } from "@/lib/inventory-quantity";
import { QUANTITY_UNITS } from "@/lib/inventory-quantity-unit";

export const MOVEMENT_TYPES = ["in", "out", "adjustment"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const movementSchema = z.object({
  product_id: z.string().uuid("Debe seleccionar un producto válido"),
  movement_type: z.enum(MOVEMENT_TYPES, { message: "Debe seleccionar el tipo de movimiento" }),
  quantity: z
    .number({ message: "Indicá una cantidad válida" })
    .finite()
    .positive("La cantidad debe ser mayor que 0"),
  /**
   * pack = cajas/pacas (stock BD).
   * unit = presentación suelta (tula…); se convierte con el factor del empaque.
   */
  quantity_unit: z.enum(QUANTITY_UNITS).default("pack"),
  historical_unit_cost: z
    .number()
    .min(0, "El costo unitario no puede ser negativo"),
  notes: z
    .string()
    .max(500, "Las observaciones no pueden superar 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type MovementFormValues = z.infer<typeof movementSchema>;

/** Una línea del registro masivo (sin notas; las notas van a nivel del lote). */
export const movementLineSchema = movementSchema.omit({ notes: true });
export type MovementLineFormValues = z.infer<typeof movementLineSchema>;

const globalNotesSchema = z.preprocess(
  (value) => (value == null ? "" : value),
  z.string().max(500, "Las observaciones no pueden superar 500 caracteres"),
);

export const batchInventoryMovementSchema = z.object({
  global_notes: globalNotesSchema.optional().or(z.literal("")),
  lines: z
    .array(movementLineSchema)
    .min(1, "Agregá al menos un producto"),
  /** Evita guardar dos veces el mismo comprobante (doble click / reintento). */
  idempotency_key: z.string().uuid().optional(),
});

export function parseMovementFormValues(
  raw: BatchInventoryMovementFormValues,
):
  | { success: true; data: BatchInventoryMovementFormValues }
  | { success: false; message: string } {
  const normalized: BatchInventoryMovementFormValues = {
    global_notes: raw.global_notes == null ? "" : String(raw.global_notes),
    idempotency_key:
      typeof raw.idempotency_key === "string" && raw.idempotency_key.trim().length > 0
        ? raw.idempotency_key.trim()
        : undefined,
    lines: (raw.lines ?? [])
      .filter((line) => String(line.product_id ?? "").trim().length > 0)
      .map((line) => ({
        product_id: String(line.product_id ?? "").trim(),
        movement_type: line.movement_type ?? "in",
        quantity: toStockNumber(line.quantity),
        quantity_unit:
          line.quantity_unit === "unit" || line.quantity_unit === "pack"
            ? line.quantity_unit
            : "pack",
        historical_unit_cost: toStockNumber(line.historical_unit_cost ?? 0),
      })),
  };

  const parsed = batchInventoryMovementSchema.safeParse(normalized);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue?.message ??
      (issue?.path?.length
        ? `Revisá el campo ${issue.path.join(".")}`
        : "Revisá los datos del formulario");
    return { success: false, message };
  }

  return { success: true, data: parsed.data };
}

export type BatchInventoryMovementFormValues = z.infer<typeof batchInventoryMovementSchema>;
