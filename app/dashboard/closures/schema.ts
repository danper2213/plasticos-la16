import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "comida",
  "transporte",
  "compras",
  "servicios",
  "otros",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  comida: "Comida",
  transporte: "Transporte",
  compras: "Compras",
  servicios: "Servicios",
  otros: "Otros",
};

const expenseItemSchema = z.object({
  amount: z.number().min(0, "El monto no puede ser negativo"),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Seleccione una categoría" }),
  description: z.string().max(200).optional().or(z.literal("")),
});

export const closureSchema = z.object({
  closure_date: z.string().min(1, "La fecha del cierre es obligatoria"),
  initial_balance: z.number().min(0, "El saldo inicial no puede ser negativo").default(0),
  sales_total: z.number().min(0, "No puede ser negativo").default(0),
  system_total_income: z.number().min(0, "Las entradas no pueden ser negativas"),
  expenses: z.array(expenseItemSchema).default([]),
});

export type ExpenseItemForm = z.infer<typeof expenseItemSchema>;
export type ClosureFormValues = z.infer<typeof closureSchema>;
