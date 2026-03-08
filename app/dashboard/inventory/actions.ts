"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { MovementFormValues } from "./schema";

/** Raw row from Supabase with FK relation */
export interface MovementRow {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  historical_unit_cost: number;
  notes: string | null;
  movement_date: string;
  created_at?: string;
  products: { name: string; presentation: string } | { name: string; presentation: string }[] | null;
}

export interface MovementWithProduct extends Omit<MovementRow, "products"> {
  product_name: string;
  product_presentation: string;
}

export interface ActiveProductOption {
  id: string;
  name: string;
  cost: number;
}

export async function getInventoryMovements(): Promise<MovementWithProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      `
      id,
      product_id,
      movement_type,
      quantity,
      historical_unit_cost,
      notes,
      movement_date,
      created_at,
      products ( name, presentation )
    `
    )
    .order("movement_date", { ascending: false });

  if (error) {
    console.error("getInventoryMovements error:", error);
    return [];
  }

  const rows = (data ?? []) as MovementRow[];
  return rows.map((row) => {
    const p = row.products;
    const name = Array.isArray(p) ? p[0]?.name : p?.name;
    const presentation = Array.isArray(p) ? p[0]?.presentation : p?.presentation;
    return {
      id: row.id,
      product_id: row.product_id,
      movement_type: row.movement_type,
      quantity: row.quantity,
      historical_unit_cost: row.historical_unit_cost,
      notes: row.notes,
      movement_date: row.movement_date,
      created_at: row.created_at,
      product_name: name ?? "—",
      product_presentation: presentation ?? "",
    };
  });
}

export async function getActiveProducts(): Promise<ActiveProductOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, cost")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getActiveProducts error:", error);
    return [];
  }
  return (data ?? []) as ActiveProductOption[];
}

export async function createMovement(data: MovementFormValues) {
  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    product_id: data.product_id,
    movement_type: data.movement_type,
    quantity: data.quantity,
    historical_unit_cost: data.historical_unit_cost,
    notes: data.notes?.trim() || null,
    movement_date: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/inventory");
  return { success: true as const };
}
