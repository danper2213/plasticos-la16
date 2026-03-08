"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { CustomerFormValues } from "./schema";

export interface Customer {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, tax_id, phone, address, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getCustomers error:", error);
    return [];
  }
  return (data ?? []) as Customer[];
}

export async function createCustomer(data: CustomerFormValues) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    name: data.name.trim(),
    tax_id: data.tax_id.trim() || null,
    phone: data.phone.trim() || null,
    address: data.address?.trim() || null,
    is_active: true,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/customers");
  return { success: true as const };
}

export async function updateCustomer(id: string, data: CustomerFormValues) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: data.name.trim(),
      tax_id: data.tax_id.trim() || null,
      phone: data.phone.trim() || null,
      address: data.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/customers");
  return { success: true as const };
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/customers");
  return { success: true as const };
}
