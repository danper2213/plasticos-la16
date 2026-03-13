"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
import type { SamitClosureFormValues } from "./schema";

export interface SamitClosure {
  id: string;
  closure_date: string;
  initial_balance: number;
  sales_total: number;
  payments_total: number;
  total: number;
  created_at?: string;
}

/** Cierres SAMIT del mes indicado. */
export async function getSamitClosures(
  month: number,
  year: number
): Promise<SamitClosure[]> {
  const { supabase } = await requireUser();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("samit_closures")
    .select("id, closure_date, initial_balance, sales_total, payments_total, total, created_at")
    .gte("closure_date", start)
    .lte("closure_date", end)
    .order("closure_date", { ascending: false });

  if (error) {
    console.error("getSamitClosures error:", error);
    return [];
  }
  return (data ?? []) as SamitClosure[];
}

/** Último total para sugerir saldo inicial en un registro nuevo. */
export async function getLatestSamitTotalForSuggestion(): Promise<number> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("samit_closures")
    .select("total")
    .order("closure_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return 0;
  return Number(data.total) || 0;
}

export async function createSamitClosure(data: SamitClosureFormValues) {
  const { supabase } = await requireUser();
  const total =
    (data.initial_balance ?? 0) + (data.sales_total ?? 0) - (data.payments_total ?? 0);

  const { error } = await supabase.from("samit_closures").insert({
    closure_date: data.closure_date,
    initial_balance: data.initial_balance ?? 0,
    sales_total: data.sales_total ?? 0,
    payments_total: data.payments_total ?? 0,
    total,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/closures/samit");
  return { success: true as const };
}

export async function deleteSamitClosure(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("samit_closures").delete().eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/closures/samit");
  return { success: true as const };
}
