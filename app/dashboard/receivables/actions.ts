"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ReceivableFormValues, ReceivablePaymentFormValues } from "./schema";

/** Supabase returns FK relation as object (many-to-one) or possibly array */
export interface ReceivableRow {
  id: string;
  customer_id: string;
  concept: string;
  external_invoice_number: string | null;
  total_amount: number;
  issue_date: string;
  due_date: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  customers: { name: string } | { name: string }[] | null;
}

export interface ReceivableWithCustomer extends Omit<ReceivableRow, "customers"> {
  customer_name: string;
}

export interface ActiveCustomerOption {
  id: string;
  name: string;
}

export interface BankAccountOption {
  id: string;
  name: string;
}

export async function getReceivables(): Promise<ReceivableWithCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts_receivable")
    .select(
      `
      id,
      customer_id,
      concept,
      external_invoice_number,
      total_amount,
      issue_date,
      due_date,
      status,
      created_at,
      updated_at,
      customers ( name )
    `
    )
    .order("issue_date", { ascending: false });

  if (error) {
    console.error("getReceivables error:", error);
    return [];
  }

  const rows = (data ?? []) as ReceivableRow[];
  return rows.map((row) => {
    const c = row.customers;
    const name = Array.isArray(c) ? c[0]?.name : c?.name;
    return {
      id: row.id,
      customer_id: row.customer_id,
      concept: row.concept,
      external_invoice_number: row.external_invoice_number,
      total_amount: row.total_amount,
      issue_date: row.issue_date,
      due_date: row.due_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      customer_name: name ?? "—",
    };
  });
}

export async function getActiveCustomers(): Promise<ActiveCustomerOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getActiveCustomers error:", error);
    return [];
  }
  return (data ?? []) as ActiveCustomerOption[];
}

export async function getBankAccounts(): Promise<BankAccountOption[]> {
  const supabase = await createClient();
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

export async function createReceivable(data: ReceivableFormValues) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts_receivable").insert({
    customer_id: data.customer_id,
    concept: data.concept.trim(),
    external_invoice_number: data.external_invoice_number?.trim() || null,
    total_amount: data.total_amount,
    issue_date: data.issue_date,
    due_date: data.due_date?.trim() || null,
    status: "pending",
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/receivables");
  return { success: true as const };
}

export async function createReceivablePayment(
  data: ReceivablePaymentFormValues,
  receivableId: string
) {
  const supabase = await createClient();

  const { error: insertError } = await supabase.from("receivable_payments").insert({
    account_receivable_id: receivableId,
    amount_received: data.amount_received,
    destination_of_funds: data.destination_of_funds,
    payment_date: data.payment_date,
  });

  if (insertError) {
    return { success: false as const, error: insertError.message };
  }

  const { error: updateError } = await supabase
    .from("accounts_receivable")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", receivableId);

  if (updateError) {
    return { success: false as const, error: updateError.message };
  }

  revalidatePath("/dashboard/receivables");
  return { success: true as const };
}
