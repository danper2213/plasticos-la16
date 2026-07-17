"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/require-user";
import { supplierIdSchema, supplierSchema } from "./schema";
import type { Supplier, SupplierBankInfo } from "./types";

function formatZodError(error: { issues: { message: string }[] }): string {
  return error.issues.map((i) => i.message).join(" · ") || "Datos no válidos";
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, tax_id, bank_name, account_type, account_number, bank_agreement, phone, show_on_website, logo_url, website_url, sort_order, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    const fallback = await supabase
      .from("suppliers")
      .select("id, name, tax_id, bank_name, account_type, account_number, bank_agreement, phone, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (fallback.error) {
      console.error("getSuppliers error:", fallback.error);
      return [];
    }
    return ((fallback.data ?? []) as Partial<Supplier>[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      tax_id: row.tax_id ?? null,
      bank_name: row.bank_name ?? null,
      account_type: row.account_type ?? null,
      account_number: row.account_number ?? null,
      bank_agreement: row.bank_agreement ?? null,
      phone: row.phone ?? null,
      show_on_website: false,
      logo_url: null,
      website_url: null,
      sort_order: 0,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }
  return ((data ?? []) as Partial<Supplier>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    tax_id: row.tax_id ?? null,
    bank_name: row.bank_name ?? null,
    account_type: row.account_type ?? null,
    account_number: row.account_number ?? null,
    bank_agreement: row.bank_agreement ?? null,
    phone: row.phone ?? null,
    show_on_website: Boolean(row.show_on_website),
    logo_url: row.logo_url ?? null,
    website_url: row.website_url ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function createSupplier(input: unknown) {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;
  const { supabase } = await requireAdmin();
  let { error } = await supabase.from("suppliers").insert({
    name: data.name.trim(),
    tax_id: data.tax_id.trim() || null,
    bank_name: data.bank_name?.trim() || null,
    account_type: data.account_type ?? null,
    account_number: data.account_number?.trim() || null,
    bank_agreement: data.bank_agreement?.trim() || null,
    phone: data.phone?.trim() || null,
    show_on_website: data.show_on_website,
    logo_url: data.logo_url?.trim() || null,
    website_url: data.website_url?.trim() || null,
    sort_order: data.sort_order ?? 0,
    is_active: true,
  });
  if (error?.message?.toLowerCase().includes("column")) {
    const fallback = await supabase.from("suppliers").insert({
      name: data.name.trim(),
      tax_id: data.tax_id.trim() || null,
      bank_name: data.bank_name?.trim() || null,
      account_type: data.account_type ?? null,
      account_number: data.account_number?.trim() || null,
      bank_agreement: data.bank_agreement?.trim() || null,
      phone: data.phone?.trim() || null,
      is_active: true,
    });
    error = fallback.error;
  }

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/proveedores");
  revalidatePath("/");
  return { success: true as const };
}

export async function updateSupplier(id: string, input: unknown) {
  const idParsed = supplierIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false as const, error: "Identificador de proveedor no válido" };
  }
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;
  const { supabase } = await requireAdmin();
  let { error } = await supabase
    .from("suppliers")
    .update({
      name: data.name.trim(),
      tax_id: data.tax_id.trim() || null,
      bank_name: data.bank_name?.trim() || null,
      account_type: data.account_type ?? null,
      account_number: data.account_number?.trim() || null,
      bank_agreement: data.bank_agreement?.trim() || null,
      phone: data.phone?.trim() || null,
      show_on_website: data.show_on_website,
      logo_url: data.logo_url?.trim() || null,
      website_url: data.website_url?.trim() || null,
      sort_order: data.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idParsed.data);
  if (error?.message?.toLowerCase().includes("column")) {
    const fallback = await supabase
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
      .eq("id", idParsed.data);
    error = fallback.error;
  }

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/proveedores");
  revalidatePath("/");
  return { success: true as const };
}

export async function getSupplierBankInfo(supplierId: string): Promise<SupplierBankInfo | null> {
  const { supabase } = await requireAdmin();
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
  const parsed = supplierIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false as const, error: "Identificador de proveedor no válido" };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/proveedores");
  revalidatePath("/");
  return { success: true as const };
}
