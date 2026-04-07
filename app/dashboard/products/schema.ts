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
  image_url: z.union([
    z.literal(""),
    z.string().trim().url("La URL de la imagen no es válida"),
  ]),
  featured_on_landing: z.boolean().optional().default(false),
  featured_sort_order: z.coerce.number().int().min(0).default(0),
})
  .superRefine((data, ctx) => {
    if (data.featured_on_landing && !data.image_url?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Para mostrar en destacados subí una imagen o pegá una URL válida.",
        path: ["image_url"],
      });
    }
  });

export type ProductFormValues = z.input<typeof productSchema>;
