import { z } from "zod";

export const MOVEMENT_TYPES = ["in", "out", "adjustment"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const movementSchema = z.object({
  product_id: z.string().uuid("Debe seleccionar un producto válido"),
  movement_type: z.enum(MOVEMENT_TYPES, { message: "Debe seleccionar el tipo de movimiento" }),
  quantity: z
    .number()
    .min(1, "La cantidad debe ser al menos 1"),
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

export const batchInventoryMovementSchema = z.object({
  global_notes: z
    .string()
    .max(500, "Las observaciones no pueden superar 500 caracteres")
    .optional()
    .or(z.literal("")),
  lines: z
    .array(movementLineSchema)
    .min(1, "Agregá al menos un producto"),
});

export type BatchInventoryMovementFormValues = z.infer<typeof batchInventoryMovementSchema>;
