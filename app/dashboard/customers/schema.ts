import { z } from "zod";
import { validarNitOCedulaConDV } from "@/lib/dian-dv";

export const customerSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      const n = data.tax_id.replace(/\D/g, "");
      if (n.length < 9) return true;
      return validarNitOCedulaConDV(data.tax_id);
    },
    {
      message:
        "La identificación / NIT no es válida: el dígito de verificación no coincide (norma DIAN Colombia).",
      path: ["tax_id"],
    }
  );

export type CustomerFormValues = z.infer<typeof customerSchema>;
