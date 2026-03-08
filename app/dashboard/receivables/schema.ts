import { z } from "zod";

const uuidSchema = z.string().uuid("Debe seleccionar un cliente válido");

export const receivableSchema = z.object({
  customer_id: uuidSchema,
  concept: z
    .string()
    .min(1, "El concepto es obligatorio")
    .max(300, "El concepto no puede superar 300 caracteres"),
  external_invoice_number: z
    .string()
    .max(50, "El número de factura no puede superar 50 caracteres")
    .optional()
    .or(z.literal("")),
  total_amount: z
    .number()
    .min(0.01, "El valor total es obligatorio y debe ser mayor a cero"),
  issue_date: z
    .string()
    .min(1, "La fecha de emisión es obligatoria"),
  due_date: z.string().optional().or(z.literal("")),
});

export type ReceivableFormValues = z.infer<typeof receivableSchema>;

export const receivablePaymentSchema = z.object({
  amount_received: z
    .number()
    .min(0.01, "El monto es obligatorio y debe ser mayor a cero"),
  destination_of_funds: z
    .string()
    .min(1, "Debe seleccionar el destino de fondos"),
  payment_date: z
    .string()
    .min(1, "La fecha de pago es obligatoria"),
});

export type ReceivablePaymentFormValues = z.infer<typeof receivablePaymentSchema>;
