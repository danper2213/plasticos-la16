import { z } from "zod";

export const dailyRegisterSchema = z.object({
  register_date: z.string().min(1, "La fecha es obligatoria"),
  previous_balance: z.number().default(0),
  samit_sales_total: z.number().min(0, "No puede ser negativo").default(0),
  cash_total: z.number().min(0, "No puede ser negativo").default(0),
  transfers_total: z.number().min(0, "No puede ser negativo").default(0),
  expenses_total: z.number().min(0, "No puede ser negativo").default(0),
  payments_total: z.number().min(0, "No puede ser negativo").default(0),
});

export type DailyRegisterFormValues = z.infer<typeof dailyRegisterSchema>;

export const dailyRegisterIdSchema = z.string().uuid("Identificador de registro no válido");
