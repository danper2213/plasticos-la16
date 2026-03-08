import { z } from "zod";

const uuidSchema = z.string().uuid("El proveedor seleccionado no es válido");

export const payableSchema = z.object({
  supplier_id: uuidSchema,
  invoice_number: z
    .string()
    .min(1, "El número de factura es obligatorio")
    .max(50, "El número de factura no puede superar 50 caracteres"),
  invoice_amount: z
    .number()
    .min(0.01, "El valor de la factura es obligatorio y debe ser mayor a cero"),
  reception_date: z
    .string()
    .min(1, "La fecha de recepción es obligatoria"),
  due_date: z.string().optional().nullable(),
  payment_note: z
    .string()
    .max(500, "La nota no puede superar 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type PayableFormValues = z.infer<typeof payableSchema>;

export const paymentSchema = z.object({
  amount_paid: z
    .number()
    .min(0.01, "El monto a pagar debe ser mayor a cero"),
  source_of_funds: z
    .string()
    .min(1, "Debe seleccionar el origen de fondos"),
  payment_date: z
    .string()
    .min(1, "La fecha de pago es obligatoria"),
  receipt_url: z.string().url().optional().or(z.literal("")),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
