import { z } from "zod";

export const quoteLineInputSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().min(1),
  presentation: z.string(),
  quantity: z.number().positive(),
  unit_cost: z.number().nonnegative(),
  list_unit_price: z.number().nonnegative(),
});

export const saveQuoteSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1, "Indique el nombre del cliente"),
  notes: z.string().optional(),
  valid_until: z.string().nullable().optional(),
  default_utility_percent: z.number().min(0).max(500),
  lines: z.array(quoteLineInputSchema).min(1, "Agregue al menos un producto"),
});

export type SaveQuoteInput = z.infer<typeof saveQuoteSchema>;
export type QuoteLineInput = z.infer<typeof quoteLineInputSchema>;
