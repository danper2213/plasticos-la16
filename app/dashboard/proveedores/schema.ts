import { z } from "zod";

export const ACCOUNT_TYPES = ["Ahorros", "Corriente"] as const;

export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre del proveedor es obligatorio")
    .max(200, "El nombre no puede superar 200 caracteres"),
  tax_id: z
    .string()
    .min(1, "El NIT es obligatorio")
    .max(20, "El NIT no puede superar 20 caracteres"),
  bank_name: z
    .string()
    .max(100, "El nombre del banco no puede superar 100 caracteres")
    .optional()
    .or(z.literal("")),
  account_type: z.enum(ACCOUNT_TYPES).optional().nullable(),
  account_number: z
    .string()
    .max(50, "El número de cuenta no puede superar 50 caracteres")
    .optional()
    .or(z.literal("")),
  bank_agreement: z.string().optional().or(z.literal("")),
  phone: z
    .string()
    .max(20, "El teléfono no puede superar 20 caracteres")
    .optional()
    .or(z.literal("")),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
