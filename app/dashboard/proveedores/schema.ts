import { z } from "zod";
import { validarNitOCedulaConDV } from "@/lib/dian-dv";

export const ACCOUNT_TYPES = ["Ahorros", "Corriente"] as const;

export const supplierSchema = z
  .object({
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
  show_on_website: z.boolean().optional().default(false),
  logo_url: z
    .string()
    .url("La URL del logo no es válida")
    .optional()
    .or(z.literal("")),
  website_url: z
    .string()
    .url("La URL del sitio web no es válida")
    .optional()
    .or(z.literal("")),
  sort_order: z.coerce.number().int().min(0, "El orden no puede ser negativo").default(0),
  })
  .refine(
    (data) => {
      const n = data.tax_id.replace(/\D/g, "");
      if (n.length < 9) return true;
      return validarNitOCedulaConDV(data.tax_id);
    },
    { message: "El NIT no es válido: el dígito de verificación no coincide (norma DIAN Colombia).", path: ["tax_id"] }
  );

export type SupplierFormValues = z.input<typeof supplierSchema>;
