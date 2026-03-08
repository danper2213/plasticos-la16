"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { TransactionFormValues } from "./schema";

export interface BankAccount {
  id: string;
  name: string;
  current_balance: number;
  is_active?: boolean;
}

export interface FinancialCategory {
  id: string;
  name: string;
}

/** Raw row from Supabase with FK relations */
export interface TransactionRow {
  id: string;
  bank_account_id: string;
  category_id: string;
  transaction_type: string;
  amount: number;
  description: string;
  transaction_date: string;
  created_at?: string;
  bank_accounts: { name: string } | { name: string }[] | null;
  financial_categories: { name: string } | { name: string }[] | null;
}

export interface TransactionWithRelations extends Omit<TransactionRow, "bank_accounts" | "financial_categories"> {
  bank_account_name: string;
  category_name: string;
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, name, current_balance, is_active")
    .order("name", { ascending: true });

  if (error) {
    console.error("getBankAccounts error:", error);
    return [];
  }
  return (data ?? []) as BankAccount[];
}

export async function getFinancialCategories(): Promise<FinancialCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("getFinancialCategories error:", error);
    return [];
  }
  return (data ?? []) as FinancialCategory[];
}

export async function getDailyTransactions(): Promise<TransactionWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_transactions")
    .select(
      `
      id,
      bank_account_id,
      category_id,
      transaction_type,
      amount,
      description,
      transaction_date,
      created_at,
      bank_accounts ( name ),
      financial_categories ( name )
    `
    )
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("getDailyTransactions error:", error);
    return [];
  }

  const rows = (data ?? []) as TransactionRow[];
  return rows.map((row) => {
    const bank = row.bank_accounts;
    const cat = row.financial_categories;
    const bankName = Array.isArray(bank) ? bank[0]?.name : bank?.name;
    const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
    return {
      id: row.id,
      bank_account_id: row.bank_account_id,
      category_id: row.category_id,
      transaction_type: row.transaction_type,
      amount: row.amount,
      description: row.description,
      transaction_date: row.transaction_date,
      created_at: row.created_at,
      bank_account_name: bankName ?? "—",
      category_name: categoryName ?? "—",
    };
  });
}

export async function createTransaction(data: TransactionFormValues) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_transactions").insert({
    bank_account_id: data.bank_account_id,
    category_id: data.category_id,
    transaction_type: data.transaction_type,
    amount: data.amount,
    description: data.description.trim(),
    transaction_date: data.transaction_date,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/banks");
  return { success: true as const };
}
