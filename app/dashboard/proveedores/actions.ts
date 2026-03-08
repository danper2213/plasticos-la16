"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { SupplierFormValues } from "./schema";

export interface Supplier {
  id: string;
  name: string;
  tax_id: string | null;
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  bank_agreement: string | null;
  phone: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierBankInfo {
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  bank_agreement: string | null;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, tax_id, bank_name, account_type, account_number, bank_agreement, phone, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getSuppliers error:", error);
    return [];
  }
  return (data ?? []) as Supplier[];
}

export async function createSupplier(data: SupplierFormValues) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    name: data.name.trim(),
    tax_id: data.tax_id.trim() || null,
    bank_name: data.bank_name?.trim() || null,
    account_type: data.account_type ?? null,
    account_number: data.account_number?.trim() || null,
    bank_agreement: data.bank_agreement?.trim() || null,
    phone: data.phone?.trim() || null,
    is_active: true,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/proveedores");
  return { success: true as const };
}

export async function updateSupplier(id: string, data: SupplierFormValues) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: data.name.trim(),
      tax_id: data.tax_id.trim() || null,
      bank_name: data.bank_name?.trim() || null,
      account_type: data.account_type ?? null,
      account_number: data.account_number?.trim() || null,
      bank_agreement: data.bank_agreement?.trim() || null,
      phone: data.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/proveedores");
  return { success: true as const };
}

export async function getSupplierBankInfo(supplierId: string): Promise<SupplierBankInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("bank_name, account_type, account_number, bank_agreement")
    .eq("id", supplierId)
    .single();

  if (error || !data) return null;
  return {
    bank_name: data.bank_name ?? null,
    account_type: data.account_type ?? null,
    account_number: data.account_number ?? null,
    bank_agreement: data.bank_agreement ?? null,
  };
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/proveedores");
  return { success: true as const };
}
