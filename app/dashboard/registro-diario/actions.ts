"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/require-user";
import { computeDailyRegister } from "./calc";
import {
  dailyRegisterIdSchema,
  dailyRegisterSchema,
  type DailyRegisterFormValues,
} from "./schema";

function formatZodError(error: { issues: { message: string }[] }): string {
  return error.issues.map((i) => i.message).join(" · ") || "Datos no válidos";
}

function toNumber(value: unknown): number {
  return Number(value) || 0;
}

function uniqueDateError(error: { code?: string; message?: string }): string | null {
  const code = error.code;
  const msg = (error.message ?? "").toLowerCase();
  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
    return "Ya existe un registro para esa fecha.";
  }
  return null;
}

export interface DailyRegister {
  id: string;
  register_date: string;
  previous_balance: number;
  samit_sales_total: number;
  cash_total: number;
  transfers_total: number;
  expenses_total: number;
  payments_total: number;
  created_at?: string;
  updated_at?: string;
}

const SELECT_COLUMNS =
  "id, register_date, previous_balance, samit_sales_total, cash_total, transfers_total, expenses_total, payments_total, created_at, updated_at";

function mapRow(row: Record<string, unknown>): DailyRegister {
  return {
    id: String(row.id),
    register_date: String(row.register_date).slice(0, 10),
    previous_balance: toNumber(row.previous_balance),
    samit_sales_total: toNumber(row.samit_sales_total),
    cash_total: toNumber(row.cash_total),
    transfers_total: toNumber(row.transfers_total),
    expenses_total: toNumber(row.expenses_total),
    payments_total: toNumber(row.payments_total),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function monthRange(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function insertPayload(data: DailyRegisterFormValues) {
  return {
    register_date: data.register_date,
    previous_balance: data.previous_balance ?? 0,
    samit_sales_total: data.samit_sales_total ?? 0,
    cash_total: data.cash_total ?? 0,
    transfers_total: data.transfers_total ?? 0,
    expenses_total: data.expenses_total ?? 0,
    payments_total: data.payments_total ?? 0,
  };
}

export async function getDailyRegisters(
  month: number,
  year: number
): Promise<DailyRegister[]> {
  const { supabase } = await requireAdmin();
  const { start, end } = monthRange(month, year);

  const { data, error } = await supabase
    .from("daily_registers")
    .select(SELECT_COLUMNS)
    .gte("register_date", start)
    .lte("register_date", end)
    .order("register_date", { ascending: false });

  if (error) {
    console.error("getDailyRegisters error:", error);
    return [];
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow);
}

/** Último saldo a arrastrar, para sugerir el saldo anterior de un registro nuevo. */
export async function getLatestEndingBalanceForSuggestion(): Promise<number> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("daily_registers")
    .select(
      "previous_balance, cash_total, transfers_total, expenses_total, payments_total"
    )
    .order("register_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return 0;
  const row = data as unknown as Record<string, unknown>;
  return computeDailyRegister({
    previous_balance: toNumber(row.previous_balance),
    samit_sales_total: 0,
    cash_total: toNumber(row.cash_total),
    transfers_total: toNumber(row.transfers_total),
    expenses_total: toNumber(row.expenses_total),
    payments_total: toNumber(row.payments_total),
  }).endingBalance;
}

export async function createDailyRegister(input: unknown) {
  const parsed = dailyRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("daily_registers").insert(insertPayload(parsed.data));

  if (error) {
    return {
      success: false as const,
      error: uniqueDateError(error) ?? error.message,
    };
  }

  revalidatePath("/dashboard/registro-diario");
  return { success: true as const };
}

export async function getDailyRegisterForEdit(id: string) {
  const idParsed = dailyRegisterIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false as const, error: "Identificador de registro no válido" };
  }
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("daily_registers")
    .select(SELECT_COLUMNS)
    .eq("id", idParsed.data)
    .maybeSingle();

  if (error || !data) {
    return { success: false as const, error: error?.message ?? "Registro no encontrado." };
  }

  const row = mapRow(data as unknown as Record<string, unknown>);
  const formValues: DailyRegisterFormValues = {
    register_date: row.register_date,
    previous_balance: row.previous_balance,
    samit_sales_total: row.samit_sales_total,
    cash_total: row.cash_total,
    transfers_total: row.transfers_total,
    expenses_total: row.expenses_total,
    payments_total: row.payments_total,
  };

  return { success: true as const, data: { id: row.id, ...formValues } };
}

export async function updateDailyRegister(id: string, input: unknown) {
  const idParsed = dailyRegisterIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false as const, error: "Identificador de registro no válido" };
  }
  const parsed = dailyRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("daily_registers")
    .update({
      ...insertPayload(parsed.data),
      updated_at: new Date().toISOString(),
    })
    .eq("id", idParsed.data);

  if (error) {
    return {
      success: false as const,
      error: uniqueDateError(error) ?? error.message,
    };
  }

  revalidatePath("/dashboard/registro-diario");
  return { success: true as const };
}

export async function deleteDailyRegister(id: string) {
  const parsed = dailyRegisterIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false as const, error: "Identificador de registro no válido" };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("daily_registers").delete().eq("id", parsed.data);

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/dashboard/registro-diario");
  return { success: true as const };
}
