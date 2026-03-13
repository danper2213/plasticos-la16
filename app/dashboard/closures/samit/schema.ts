import { z } from "zod";

export const samitClosureSchema = z.object({
  closure_date: z.string().min(1, "La fecha es obligatoria"),
  initial_balance: z.number().min(0, "El saldo inicial no puede ser negativo").default(0),
  sales_total: z.number().min(0, "No puede ser negativo").default(0),
  payments_total: z.number().min(0, "No puede ser negativo").default(0),
});

export type SamitClosureFormValues = z.infer<typeof samitClosureSchema>;
