import { z } from "zod";

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(200, "El nombre no puede superar 200 caracteres"),
  tax_id: z
    .string()
    .min(1, "La identificación / NIT es obligatoria")
    .max(20, "La identificación no puede superar 20 caracteres"),
  phone: z
    .string()
    .min(1, "El teléfono es obligatorio")
    .max(20, "El teléfono no puede superar 20 caracteres"),
  address: z
    .string()
    .max(300, "La dirección no puede superar 300 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
