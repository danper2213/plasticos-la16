"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
import type { ProductFormValues } from "./schema";

/** Raw row from Supabase with FK relations */
export interface ProductRow {
  id: string;
  name: string;
  presentation: string;
  packaging: string | null;
  cost: number;
  selling_price: number;
  stock_quantity: number;
  is_active: boolean;
  supplier_id: string;
  category_id: string;
  created_at?: string;
  updated_at?: string;
  suppliers: { name: string } | { name: string }[] | null;
  product_categories: { name: string } | { name: string }[] | null;
}

export interface ProductWithRelations extends Omit<ProductRow, "suppliers" | "product_categories"> {
  supplier_name: string;
  category_name: string;
}

export interface ActiveSupplierOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export async function getProducts(): Promise<ProductWithRelations[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      presentation,
      packaging,
      cost,
      selling_price,
      stock_quantity,
      is_active,
      supplier_id,
      category_id,
      created_at,
      updated_at,
      suppliers ( name ),
      product_categories ( name )
    `
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getProducts error:", error);
    return [];
  }

  const rows = (data ?? []) as ProductRow[];
  return rows.map((row) => {
    const supplier = row.suppliers;
    const category = row.product_categories;
    const supplierName = Array.isArray(supplier) ? supplier[0]?.name : supplier?.name;
    const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
    return {
      id: row.id,
      name: row.name,
      presentation: row.presentation,
      packaging: row.packaging,
      cost: row.cost,
      selling_price: row.selling_price,
      stock_quantity: row.stock_quantity,
      is_active: row.is_active,
      supplier_id: row.supplier_id,
      category_id: row.category_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      supplier_name: supplierName ?? "—",
      category_name: categoryName ?? "—",
    };
  });
}

export async function getActiveSuppliers(): Promise<ActiveSupplierOption[]> {
  const { supabase } = await requireUser();
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

export async function getCategories(): Promise<CategoryOption[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("getCategories error:", error);
    return [];
  }
  return (data ?? []) as CategoryOption[];
}

export async function createCategory(name: string) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { success: false as const, error: "El nombre de la categoría es obligatorio", id: undefined };
  }
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (error) {
    return { success: false as const, error: error.message, id: undefined };
  }
  revalidatePath("/dashboard/products");
  return { success: true as const, id: data.id as string };
}

export async function createProduct(data: ProductFormValues) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("products").insert({
    name: data.name.trim(),
    presentation: data.presentation.trim(),
    packaging: data.packaging?.trim() || null,
    cost: data.cost,
    selling_price: data.selling_price,
    supplier_id: data.supplier_id,
    category_id: data.category_id,
    is_active: true,
    // stock_quantity omitted: defaults to 0, managed by inventory
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/products");
  return { success: true as const };
}

export async function updateProduct(id: string, data: ProductFormValues) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("products")
    .update({
      name: data.name.trim(),
      presentation: data.presentation.trim(),
      packaging: data.packaging?.trim() || null,
      cost: data.cost,
      selling_price: data.selling_price,
      supplier_id: data.supplier_id,
      category_id: data.category_id,
    })
    .eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/products");
  return { success: true as const };
}
