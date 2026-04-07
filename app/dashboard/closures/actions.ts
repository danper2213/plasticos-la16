"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
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

export interface ClosureEditPayload {
  id: string;
  closure_date: string;
  initial_balance: number;
  sales_total: number;
  system_total_income: number;
  expenses: Array<{
    amount: number;
    category: ExpenseCategory;
    description?: string;
  }>;
}

/** Cierres del mes indicado (filtro como cuentas por pagar). */
export async function getClosures(
  month: number,
  year: number
): Promise<Closure[]> {
  const { supabase } = await requireUser();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("daily_closures")
    .select(
      "id, closure_date, initial_balance, sales_total, payments_total, system_total_income, system_total_expense, system_expected_balance, actual_physical_balance, difference, notes, created_at"
    )
    .gte("closure_date", start)
    .lte("closure_date", end)
    .order("closure_date", { ascending: false });

  if (error) {
    console.error("getClosures error:", error);
    return [];
  }
  return (data ?? []) as Closure[];
}

/** Último cierre (por fecha) para sugerir saldo inicial en un registro nuevo. */
export async function getLatestClosureForSuggestion(): Promise<number> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("daily_closures")
    .select("system_expected_balance")
    .order("closure_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return 0;
  return Number(data.system_expected_balance) || 0;
}

/** Gastos del mes agrupados por categoría (comida, transporte, compras, servicios, otros). */
export async function getMonthlyExpensesByCategory(
  month: number,
  year: number
): Promise<MonthlyExpenseByCategory[]> {
  const { supabase } = await requireUser();
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
  const { supabase } = await requireUser();
  const totalExpense = (data.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  // Saldo esperado = Saldo inicial + Venta efectivo + Entradas transferencia - Gastos (se arrastra al día siguiente)
  const system_expected_balance =
    (data.initial_balance ?? 0) +
    (data.sales_total ?? 0) +
    data.system_total_income -
    totalExpense;

  const insertPayload = {
    closure_date: data.closure_date,
    initial_balance: data.initial_balance ?? 0,
    sales_total: data.sales_total ?? 0,
    payments_total: 0,
    system_total_income: data.system_total_income,
    system_total_expense: totalExpense,
    system_expected_balance,
    actual_physical_balance: system_expected_balance,
    difference: 0,
    notes: null,
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

export async function getClosureForEdit(id: string) {
  const { supabase } = await requireUser();

  const { data: closure, error: closureError } = await supabase
    .from("daily_closures")
    .select("id, closure_date, initial_balance, sales_total, system_total_income")
    .eq("id", id)
    .maybeSingle();

  if (closureError || !closure) {
    return { success: false as const, error: closureError?.message ?? "Cierre no encontrado." };
  }

  const { data: expenses, error: expensesError } = await supabase
    .from("daily_expenses")
    .select("amount, category, description")
    .eq("closure_id", id)
    .order("created_at", { ascending: true });

  if (expensesError) {
    return { success: false as const, error: expensesError.message };
  }

  const payload: ClosureEditPayload = {
    id: closure.id,
    closure_date: closure.closure_date,
    initial_balance: Number(closure.initial_balance) || 0,
    sales_total: Number(closure.sales_total) || 0,
    system_total_income: Number(closure.system_total_income) || 0,
    expenses: (expenses ?? []).map((e) => ({
      amount: Number(e.amount) || 0,
      category: e.category as ExpenseCategory,
      description: e.description ?? "",
    })),
  };

  return { success: true as const, data: payload };
}

export async function updateClosure(id: string, data: ClosureFormValues) {
  const { supabase } = await requireUser();

  const totalExpense = (data.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const system_expected_balance =
    (data.initial_balance ?? 0) +
    (data.sales_total ?? 0) +
    data.system_total_income -
    totalExpense;

  const { error: updateError } = await supabase
    .from("daily_closures")
    .update({
      closure_date: data.closure_date,
      initial_balance: data.initial_balance ?? 0,
      sales_total: data.sales_total ?? 0,
      payments_total: 0,
      system_total_income: data.system_total_income,
      system_total_expense: totalExpense,
      system_expected_balance,
      actual_physical_balance: system_expected_balance,
      difference: 0,
      notes: null,
    })
    .eq("id", id);

  if (updateError) {
    return { success: false as const, error: updateError.message };
  }

  const { error: deleteExpensesError } = await supabase
    .from("daily_expenses")
    .delete()
    .eq("closure_id", id);

  if (deleteExpensesError) {
    return { success: false as const, error: deleteExpensesError.message };
  }

  const expenses = data.expenses ?? [];
  if (expenses.length > 0) {
    const rows = expenses.map((e) => ({
      closure_id: id,
      amount: e.amount,
      category: e.category,
      description: e.description?.trim() || null,
    }));
    const { error: insertExpensesError } = await supabase.from("daily_expenses").insert(rows);
    if (insertExpensesError) {
      return { success: false as const, error: insertExpensesError.message };
    }
  }

  revalidatePath("/dashboard/closures");
  return { success: true as const };
}

export async function deleteClosure(id: string) {
  const { supabase } = await requireUser();
  const { error: expensesError } = await supabase
    .from("daily_expenses")
    .delete()
    .eq("closure_id", id);

  if (expensesError) {
    console.error("deleteClosure daily_expenses error:", expensesError);
    return { success: false as const, error: expensesError.message };
  }

  const { error: closureError } = await supabase
    .from("daily_closures")
    .delete()
    .eq("id", id);

  if (closureError) {
    return { success: false as const, error: closureError.message };
  }
  revalidatePath("/dashboard/closures");
  return { success: true as const };
}
