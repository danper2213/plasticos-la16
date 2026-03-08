import { z } from "zod";

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const transactionSchema = z.object({
  bank_account_id: z.string().uuid("Debe seleccionar una cuenta bancaria válida"),
  category_id: z.string().uuid("Debe seleccionar una categoría"),
  transaction_type: z.enum(TRANSACTION_TYPES, {
    message: "Debe seleccionar el tipo de movimiento",
  }),
  amount: z
    .number()
    .min(0.01, "El monto es obligatorio y debe ser mayor a cero"),
  description: z
    .string()
    .min(1, "La descripción es obligatoria")
    .max(500, "La descripción no puede superar 500 caracteres"),
  transaction_date: z
    .string()
    .min(1, "La fecha es obligatoria"),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
