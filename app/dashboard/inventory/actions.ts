"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
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
  created_by_user_id: string | null;
  created_by_email: string | null;
  products:
    | { name: string; presentation: string; packaging: string | null }
    | { name: string; presentation: string; packaging: string | null }[]
    | null;
}

export interface MovementWithProduct extends Omit<MovementRow, "products"> {
  product_name: string;
  product_presentation: string;
  product_packaging: string | null;
}

export interface ActiveProductOption {
  id: string;
  name: string;
  cost: number;
}

/** Resultado de búsqueda para el formulario de movimientos. */
export interface ProductSearchHit {
  id: string;
  name: string;
  presentation: string;
  /** Caja madre / embalaje, ej. "Caja x60 paq" — se parsea para conversión de unidades */
  packaging: string | null;
  cost: number;
}

const MOVEMENTS_SELECT_WITH_USER = `
  id,
  product_id,
  movement_type,
  quantity,
  historical_unit_cost,
  notes,
  movement_date,
  created_at,
  created_by_user_id,
  created_by_email,
  products ( name, presentation, packaging )
`;

const MOVEMENTS_SELECT_LEGACY = `
  id,
  product_id,
  movement_type,
  quantity,
  historical_unit_cost,
  notes,
  movement_date,
  created_at,
  products ( name, presentation, packaging )
`;

export async function getInventoryMovements(options?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}): Promise<MovementWithProduct[]> {
  const { supabase } = await requireUser();

  const runQuery = (select: string) => {
    let query = supabase
      .from("inventory_movements")
      .select(select)
      .order("movement_date", { ascending: false });
    if (options?.dateFrom) query = query.gte("movement_date", options.dateFrom);
    if (options?.dateTo) query = query.lte("movement_date", options.dateTo);
    if (options?.productId) query = query.eq("product_id", options.productId);
    return query;
  };

  let data: MovementRow[] | null = null;
  let error: unknown = null;
  let withUserColumns = true;

  const res = await runQuery(MOVEMENTS_SELECT_WITH_USER);
  if (res.error) {
    error = res.error;
    const resLegacy = await runQuery(MOVEMENTS_SELECT_LEGACY);
    if (resLegacy.error) {
      console.error("getInventoryMovements error:", resLegacy.error);
      return [];
    }
    data = resLegacy.data as (MovementRow & { created_by_user_id?: null; created_by_email?: null })[];
    withUserColumns = false;
  } else {
    data = res.data as MovementRow[];
  }

  const rows = (data ?? []) as (MovementRow & { created_by_user_id?: string | null; created_by_email?: string | null })[];
  return rows.map((row) => {
    const p = row.products;
    const name = Array.isArray(p) ? p[0]?.name : p?.name;
    const presentation = Array.isArray(p) ? p[0]?.presentation : p?.presentation;
    const packaging = Array.isArray(p) ? p[0]?.packaging : p?.packaging;
    return {
      id: row.id,
      product_id: row.product_id,
      movement_type: row.movement_type,
      quantity: row.quantity,
      historical_unit_cost: row.historical_unit_cost,
      notes: row.notes,
      movement_date: row.movement_date,
      created_at: row.created_at,
      created_by_user_id: withUserColumns ? (row.created_by_user_id ?? null) : null,
      created_by_email: withUserColumns ? (row.created_by_email ?? null) : null,
      product_name: name ?? "—",
      product_presentation: presentation ?? "",
      product_packaging: packaging ?? null,
    };
  });
}

/** Nombre de un producto por id (para mostrar en historial cuando no hay movimientos). */
export async function getProductNameById(productId: string): Promise<string | null> {
  if (!productId) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { name: string }).name ?? null;
}

export async function getActiveProducts(): Promise<ActiveProductOption[]> {
  const { supabase } = await requireUser();
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

/** Búsqueda de productos por nombre para el registro de movimientos. */
export async function searchProductsForMovement(query: string): Promise<ProductSearchHit[]> {
  const trimmed = query?.trim();
  const { supabase } = await requireUser();
  if (!trimmed || trimmed.length < 2) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, presentation, packaging, cost")
    .eq("is_active", true)
    .ilike("name", `%${trimmed}%`)
    .order("name", { ascending: true })
    .limit(20);
  if (error) {
    console.error("searchProductsForMovement error:", error);
    return [];
  }
  return (data ?? []) as ProductSearchHit[];
}

export async function createMovement(data: MovementFormValues) {
  const { supabase, user } = await requireUser();
  const base = {
    product_id: data.product_id,
    movement_type: data.movement_type,
    quantity: data.quantity,
    historical_unit_cost: data.historical_unit_cost,
    notes: data.notes?.trim() || null,
    movement_date: new Date().toISOString().slice(0, 10),
  };
  let result = await supabase.from("inventory_movements").insert({
    ...base,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null,
  });
  if (result.error) {
    result = await supabase.from("inventory_movements").insert(base);
  }
  if (result.error) {
    return { success: false as const, error: result.error.message };
  }
  revalidatePath("/dashboard/inventory");
  return { success: true as const };
}

export async function deleteMovement(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("inventory_movements").delete().eq("id", id);
  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/inventory");
  return { success: true as const };
}
