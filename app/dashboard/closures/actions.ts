"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ClosureFormValues, ExpenseCategory } from "./schema";

export interface Closure {
  id: string;
  closure_date: string;
  initial_balance: number;
  sales_total: number;
  payments_total: number;
  system_total_income: number;
  system_total_expense: number;
  system_expected_balance: number;
  actual_physical_balance: number;
  difference: number;
  notes: string | null;
  created_at?: string;
}

export interface MonthlyExpenseByCategory {
  category: ExpenseCategory;
  total: number;
}

export async function getClosures(): Promise<Closure[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_closures")
    .select(
      "id, closure_date, initial_balance, sales_total, payments_total, system_total_income, system_total_expense, system_expected_balance, actual_physical_balance, difference, notes, created_at"
    )
    .order("closure_date", { ascending: false });

  if (error) {
    console.error("getClosures error:", error);
    return [];
  }
  return (data ?? []) as Closure[];
}

/** Total pagado en el mes (pagos facturas/transporte - DIAN). Para el dashboard. */
export async function getMonthlyPaymentsTotal(
  month: number,
  year: number
): Promise<number> {
  const supabase = await createClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("daily_closures")
    .select("payments_total")
    .gte("closure_date", start)
    .lte("closure_date", end);

  if (error) {
    console.error("getMonthlyPaymentsTotal error:", error);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + (Number(row.payments_total) || 0), 0);
}

/** Gastos del mes agrupados por categoría (comida, transporte, compras, servicios, otros). */
export async function getMonthlyExpensesByCategory(
  month: number,
  year: number
): Promise<MonthlyExpenseByCategory[]> {
  const supabase = await createClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: closures, error: closuresError } = await supabase
    .from("daily_closures")
    .select("id")
    .gte("closure_date", start)
    .lte("closure_date", end);

  if (closuresError || !closures?.length) {
    return [];
  }

  const closureIds = closures.map((c) => c.id);
  const { data: expenses, error } = await supabase
    .from("daily_expenses")
    .select("category, amount")
    .in("closure_id", closureIds);

  if (error) {
    console.error("getMonthlyExpensesByCategory error:", error);
    return [];
  }

  const byCategory = (expenses ?? []).reduce(
    (acc, row) => {
      const cat = row.category as ExpenseCategory;
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += Number(row.amount) || 0;
      return acc;
    },
    {} as Record<ExpenseCategory, number>
  );

  return (["comida", "transporte", "compras", "servicios", "otros"] as const).map(
    (category) => ({
      category,
      total: byCategory[category] ?? 0,
    })
  );
}

export async function createClosure(data: ClosureFormValues) {
  const supabase = await createClient();
  const totalExpense = (data.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const system_expected_balance =
    (data.initial_balance ?? 0) + data.system_total_income - totalExpense;
  const difference = data.actual_physical_balance - system_expected_balance;

  const insertPayload = {
    closure_date: data.closure_date,
    initial_balance: data.initial_balance ?? 0,
    sales_total: data.sales_total ?? 0,
    payments_total: data.payments_total ?? 0,
    system_total_income: data.system_total_income,
    system_total_expense: totalExpense,
    system_expected_balance,
    actual_physical_balance: data.actual_physical_balance,
    difference,
    notes: data.notes?.trim() || null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("daily_closures")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError) {
    return { success: false as const, error: insertError.message };
  }

  const expenses = data.expenses ?? [];
  if (expenses.length > 0 && inserted?.id) {
    const rows = expenses.map((e) => ({
      closure_id: inserted.id,
      amount: e.amount,
      category: e.category,
      description: e.description?.trim() || null,
    }));
    const { error: expError } = await supabase.from("daily_expenses").insert(rows);
    if (expError) {
      console.error("daily_expenses insert error:", expError);
      return { success: false as const, error: expError.message };
    }
  }

  revalidatePath("/dashboard/closures");
  return { success: true as const };
}
