"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/require-user";
import {
  dueDateSchema,
  payableIdSchema,
  payableSchema,
  paymentSchema,
} from "./schema";

function formatZodError(error: { issues: { message: string }[] }): string {
  return error.issues.map((i) => i.message).join(" · ") || "Datos no válidos";
}

/** Supplier relation shape from Supabase join */
export interface PayableSupplierRelation {
  name?: string | null;
  bank_name?: string | null;
  account_type?: string | null;
  account_number?: string | null;
  bank_agreement?: string | null;
}

/** Supabase returns FK relation as object (many-to-one) or possibly array */
export interface PayableRow {
  id: string;
  supplier_id: string;
  invoice_number: string;
  invoice_amount: number;
  reception_date: string;
  due_date: string | null;
  status: string;
  payment_note: string | null;
  created_at?: string;
  updated_at?: string;
  suppliers: PayableSupplierRelation | PayableSupplierRelation[] | null;
}

export interface PayableWithSupplier extends Omit<PayableRow, "suppliers"> {
  supplier_name: string;
  supplier_bank_name: string | null;
  supplier_account_type: string | null;
  supplier_account_number: string | null;
  supplier_bank_agreement: string | null;
}

export interface ActiveSupplierOption {
  id: string;
  name: string;
}

/**
 * Get payables whose due_date falls strictly within the selected month and year.
 * An invoice due in April is NOT returned when March is selected.
 * month: 1-12, year: full year (e.g. 2026).
 */
export async function getPayables(
  month: number,
  year: number
): Promise<PayableWithSupplier[]> {
  const { supabase } = await requireAdmin();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("accounts_payable")
    .select(
      `
      id,
      supplier_id,
      invoice_number,
      invoice_amount,
      reception_date,
      due_date,
      status,
      payment_note,
      created_at,
      updated_at,
      suppliers ( name, bank_name, account_type, account_number, bank_agreement )
    `
    )
    .not("due_date", "is", "null")
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("getPayables error:", error);
    return [];
  }

  const rows = (data ?? []) as PayableRow[];
  const mapped = rows.map((row) => {
    const supplier = row.suppliers;
    const s = Array.isArray(supplier) ? supplier[0] : supplier;
    return {
      id: row.id,
      supplier_id: row.supplier_id,
      invoice_number: row.invoice_number,
      invoice_amount: row.invoice_amount,
      reception_date: row.reception_date,
      due_date: row.due_date,
      status: row.status,
      payment_note: row.payment_note ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      supplier_name: s?.name ?? "—",
      supplier_bank_name: s?.bank_name ?? null,
      supplier_account_type: s?.account_type ?? null,
      supplier_account_number: s?.account_number ?? null,
      supplier_bank_agreement: s?.bank_agreement ?? null,
    };
  });

  // Smart sort: 1) Pending before Paid, 2) Within group by due_date ascending (closest first, nulls last)
  return mapped.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "pending" ? -1 : 1;
    }
    const timeA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const timeB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    return timeA - timeB;
  });
}

export async function getActiveSuppliers(): Promise<ActiveSupplierOption[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getActiveSuppliers error:", error);
    return [];
  }
  return (data ?? []) as ActiveSupplierOption[];
}

/** Normaliza a YYYY-MM-DD. Para guardar en BD sin cambio de día por timezone usamos mediodía UTC. */
function toDateOnly(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/** Fecha para insert/update: mismo día en cualquier zona (evita que se reste un día). */
function toStorageDate(value: string | null | undefined): string | null {
  const d = toDateOnly(value);
  return d ? `${d}T12:00:00.000Z` : null;
}

export async function createPayable(input: unknown) {
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;
  const { supabase } = await requireAdmin();
  const receptionDate = toStorageDate(data.reception_date) ?? (data.reception_date?.trim().slice(0, 10) ? `${data.reception_date.trim().slice(0, 10)}T12:00:00.000Z` : "");
  const dueDate = toStorageDate(data.due_date);

  const { error } = await supabase.from("accounts_payable").insert({
    supplier_id: data.supplier_id,
    invoice_number: data.invoice_number.trim(),
    invoice_amount: data.invoice_amount,
    reception_date: receptionDate || null,
    due_date: dueDate,
    status: "pending",
    payment_note: data.payment_note?.trim() || null,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/payables");
  return { success: true as const };
}

/** Actualiza solo la fecha de vencimiento (p. ej. arrastrar en el calendario). */
export async function updatePayableDueDate(id: string, dueDate: string) {
  const idParsed = payableIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false as const, error: "Identificador de cuenta por pagar no válido" };
  }
  const dateParsed = dueDateSchema.safeParse(dueDate);
  if (!dateParsed.success) {
    return { success: false as const, error: formatZodError(dateParsed.error) };
  }
  const { supabase } = await requireAdmin();
  const stored = toStorageDate(dateParsed.data);
  if (!stored) {
    return { success: false as const, error: "Fecha de vencimiento inválida" };
  }

  const { error } = await supabase
    .from("accounts_payable")
    .update({
      due_date: stored,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idParsed.data);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/payables");
  return { success: true as const };
}

export async function updatePayable(id: string, input: unknown) {
  const idParsed = payableIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false as const, error: "Identificador de cuenta por pagar no válido" };
  }
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;
  const { supabase } = await requireAdmin();
  const receptionDate = toStorageDate(data.reception_date) ?? (data.reception_date?.trim().slice(0, 10) ? `${data.reception_date.trim().slice(0, 10)}T12:00:00.000Z` : "");
  const dueDate = toStorageDate(data.due_date);

  const { error } = await supabase
    .from("accounts_payable")
    .update({
      supplier_id: data.supplier_id,
      invoice_number: data.invoice_number.trim(),
      invoice_amount: data.invoice_amount,
      reception_date: receptionDate || null,
      due_date: dueDate,
      payment_note: data.payment_note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idParsed.data);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/payables");
  return { success: true as const };
}

export async function deleteInvoice(id: string) {
  const parsed = payableIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false as const, error: "Identificador de cuenta por pagar no válido" };
  }
  const { supabase } = await requireAdmin();
  const { error: paymentsError } = await supabase
    .from("payable_payments")
    .delete()
    .eq("account_payable_id", parsed.data);

  if (paymentsError) {
    return { success: false as const, error: paymentsError.message };
  }

  const { error } = await supabase.from("accounts_payable").delete().eq("id", parsed.data);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/payables");
  return { success: true as const };
}

export interface BankAccountOption {
  id: string;
  name: string;
}

export interface PayablePaymentRow {
  id: string;
  payment_date: string;
  amount_paid: number;
  source_of_funds: string;
  receipt_url: string | null;
}

export async function getPaymentsByPayable(
  payableId: string
): Promise<PayablePaymentRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("payable_payments")
    .select("id, payment_date, amount_paid, source_of_funds, receipt_url")
    .eq("account_payable_id", payableId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("getPaymentsByPayable error:", error);
    return [];
  }
  return (data ?? []) as PayablePaymentRow[];
}

export async function getBankAccounts(): Promise<BankAccountOption[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getBankAccounts error:", error);
    return [];
  }
  return (data ?? []) as BankAccountOption[];
}

export async function createPayment(input: unknown, payableId: string) {
  const idParsed = payableIdSchema.safeParse(payableId);
  if (!idParsed.success) {
    return { success: false as const, error: "Identificador de cuenta por pagar no válido" };
  }
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;
  const { supabase } = await requireAdmin();

  const { error: insertError } = await supabase.from("payable_payments").insert({
    account_payable_id: idParsed.data,
    amount_paid: data.amount_paid,
    source_of_funds: data.source_of_funds.trim(),
    payment_date: data.payment_date,
    receipt_url: data.receipt_url?.trim() || null,
  });

  if (insertError) {
    return { success: false as const, error: insertError.message };
  }

  const { error: updateError } = await supabase
    .from("accounts_payable")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", idParsed.data);

  if (updateError) {
    return { success: false as const, error: updateError.message };
  }

  revalidatePath("/dashboard/payables");
  return { success: true as const };
}
