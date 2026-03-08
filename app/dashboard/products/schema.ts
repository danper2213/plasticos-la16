import { z } from "zod";

const uuidSchema = z.string().uuid("El valor seleccionado no es válido");

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre del producto es obligatorio")
    .max(200, "El nombre no puede superar 200 caracteres"),
  presentation: z
    .string()
    .min(1, "La presentación es obligatoria")
    .max(100, "La presentación no puede superar 100 caracteres"),
  packaging: z
    .string()
    .max(100, "El embalaje no puede superar 100 caracteres")
    .optional()
    .or(z.literal("")),
  cost: z
    .number()
    .min(0, "El costo no puede ser negativo"),
  selling_price: z.coerce.number().min(0).optional().default(0),
  supplier_id: uuidSchema,
  category_id: uuidSchema,
});

export type ProductFormValues = z.infer<typeof productSchema>;
