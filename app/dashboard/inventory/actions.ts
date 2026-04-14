"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
import {
  batchInventoryMovementSchema,
  type BatchInventoryMovementFormValues,
  type MovementFormValues,
  type MovementLineFormValues,
} from "./schema";
import { lineStockDelta } from "@/lib/inventory-stock-delta";

/** Raw row from Supabase with FK relation */
export interface MovementRow {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  historical_unit_cost: number;
  notes: string | null;
  movement_date: string;
  batch_id?: string | null;
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

/** Comprobante de inventario (un guardado) con sus líneas. */
export interface InventoryBatchWithLines {
  id: string;
  movement_date: string;
  notes: string | null;
  created_at: string;
  created_by_user_id: string | null;
  created_by_email: string | null;
  lines: MovementWithProduct[];
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
  /** Existencia en bodega (null = no controlada aún) */
  stock_quantity: number | null;
}

const MOVEMENTS_SELECT_WITH_USER = `
  id,
  product_id,
  movement_type,
  quantity,
  historical_unit_cost,
  notes,
  movement_date,
  batch_id,
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
  batch_id,
  created_at,
  products ( name, presentation, packaging )
`;

function mapMovementRow(
  row: MovementRow & { batch_id?: string | null },
  withUserColumns: boolean
): MovementWithProduct {
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
    batch_id: row.batch_id ?? null,
    created_at: row.created_at,
    created_by_user_id: withUserColumns ? (row.created_by_user_id ?? null) : null,
    created_by_email: withUserColumns ? (row.created_by_email ?? null) : null,
    product_name: name ?? "—",
    product_presentation: presentation ?? "",
    product_packaging: packaging ?? null,
  };
}

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
    data = resLegacy.data as unknown as (MovementRow & {
      created_by_user_id?: null;
      created_by_email?: null;
    })[];
    withUserColumns = false;
  } else {
    data = res.data as unknown as MovementRow[];
  }

  const rows = (data ?? []) as (MovementRow & { created_by_user_id?: string | null; created_by_email?: string | null })[];
  return rows.map((row) => mapMovementRow(row, withUserColumns));
}

/** Movimientos antiguos sin comprobante (batch_id nulo). */
export async function getInventoryLegacyMovements(options?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}): Promise<MovementWithProduct[]> {
  const { supabase } = await requireUser();

  const runQuery = (select: string) => {
    let query = supabase
      .from("inventory_movements")
      .select(select)
      .is("batch_id", null)
      .order("movement_date", { ascending: false });
    if (options?.dateFrom) query = query.gte("movement_date", options.dateFrom);
    if (options?.dateTo) query = query.lte("movement_date", options.dateTo);
    if (options?.productId) query = query.eq("product_id", options.productId);
    return query;
  };

  let data: MovementRow[] | null = null;
  let withUserColumns = true;

  const res = await runQuery(MOVEMENTS_SELECT_WITH_USER);
  if (res.error) {
    const resLegacy = await runQuery(MOVEMENTS_SELECT_LEGACY);
    if (resLegacy.error) {
      console.error("getInventoryLegacyMovements error:", resLegacy.error);
      return [];
    }
    data = resLegacy.data as unknown as MovementRow[];
    withUserColumns = false;
  } else {
    data = res.data as unknown as MovementRow[];
  }

  const rows = (data ?? []) as MovementRow[];
  return rows.map((row) => mapMovementRow(row, withUserColumns));
}

interface BatchRowFromDb {
  id: string;
  movement_date: string;
  notes: string | null;
  created_at: string;
  created_by_user_id: string | null;
  created_by_email: string | null;
  inventory_movements: MovementRow[] | MovementRow | null;
}

/** Comprobantes de inventario (facturas) con líneas; filtros por fecha del comprobante y por producto. */
export async function getInventoryBatches(options?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}): Promise<InventoryBatchWithLines[]> {
  const { supabase } = await requireUser();

  let batchIds: string[] | null = null;
  if (options?.productId) {
    const { data: midRows, error: midErr } = await supabase
      .from("inventory_movements")
      .select("batch_id")
      .eq("product_id", options.productId)
      .not("batch_id", "is", null);
    if (midErr) {
      console.error("getInventoryBatches (filter product):", midErr);
      return [];
    }
    const ids = [...new Set((midRows ?? []).map((r) => (r as { batch_id: string }).batch_id).filter(Boolean))];
    if (ids.length === 0) return [];
    batchIds = ids;
  }

  const select = `
    id,
    movement_date,
    notes,
    created_at,
    created_by_user_id,
    created_by_email,
    inventory_movements (
      id,
      product_id,
      movement_type,
      quantity,
      historical_unit_cost,
      notes,
      movement_date,
      batch_id,
      created_at,
      created_by_user_id,
      created_by_email,
      products ( name, presentation, packaging )
    )
  `;

  let q = supabase.from("inventory_movement_batches").select(select).order("created_at", { ascending: false });
  if (options?.dateFrom) q = q.gte("movement_date", options.dateFrom);
  if (options?.dateTo) q = q.lte("movement_date", options.dateTo);
  if (batchIds) q = q.in("id", batchIds);

  const { data, error } = await q;
  if (error) {
    console.error("getInventoryBatches error:", error);
    return [];
  }

  const raw = (data ?? []) as unknown as BatchRowFromDb[];
  return raw.map((b) => {
    const movRaw = b.inventory_movements;
    const movList = Array.isArray(movRaw) ? movRaw : movRaw ? [movRaw] : [];
    const withUser = movList.length > 0 && "created_by_user_id" in (movList[0] as object);
    const lines = movList
      .map((row) => mapMovementRow(row as MovementRow, Boolean(withUser)))
      .sort((a, c) => {
        const ta = new Date(a.created_at ?? a.movement_date).getTime();
        const tc = new Date(c.created_at ?? c.movement_date).getTime();
        return ta - tc;
      });
    return {
      id: b.id,
      movement_date: b.movement_date,
      notes: b.notes,
      created_at: b.created_at,
      created_by_user_id: b.created_by_user_id ?? null,
      created_by_email: b.created_by_email ?? null,
      lines,
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
    .select("id, name, presentation, packaging, cost, stock_quantity")
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

async function assertLinesDoNotCauseNegativeStock(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  lines: MovementLineFormValues[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = [...new Set(lines.map((l) => l.product_id))];
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, stock_quantity")
    .in("id", ids);
  if (error) {
    return { ok: false, error: error.message };
  }
  const rows = (products ?? []) as { id: string; name: string; stock_quantity: number | null }[];
  if (rows.length !== ids.length) {
    return { ok: false, error: "No se encontraron todos los productos para validar stock." };
  }
  const stockById = new Map(rows.map((p) => [p.id, p]));

  const running = new Map<string, number>();
  for (const line of lines) {
    const info = stockById.get(line.product_id);
    if (!info) {
      return { ok: false, error: "Producto inválido en el comprobante." };
    }
    if (!running.has(line.product_id)) {
      running.set(line.product_id, info.stock_quantity ?? 0);
    }
    const next = running.get(line.product_id)! + lineStockDelta(line);
    running.set(line.product_id, next);
    if (next < 0) {
      return {
        ok: false,
        error: `Stock insuficiente para «${info.name}»: el saldo quedaría en ${next} unidades.`,
      };
    }
  }
  return { ok: true };
}

async function applyStockDeltaToProduct(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  productId: string,
  delta: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: selErr } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  if (!row) return { ok: false, error: `Producto ${productId} no encontrado` };
  const current = (row as { stock_quantity: number | null }).stock_quantity;
  const next = Math.max(0, (current ?? 0) + delta);
  const nextVal = next === 0 && current === null ? null : next;
  const { error: updErr } = await supabase
    .from("products")
    .update({
      stock_quantity: nextVal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

async function applyStockDeltasForLines(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  lines: MovementLineFormValues[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deltaByProduct = new Map<string, number>();
  for (const line of lines) {
    const d = lineStockDelta(line);
    deltaByProduct.set(line.product_id, (deltaByProduct.get(line.product_id) ?? 0) + d);
  }
  for (const [productId, delta] of deltaByProduct) {
    const r = await applyStockDeltaToProduct(supabase, productId, delta);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export async function createMovementsBatch(data: BatchInventoryMovementFormValues) {
  const parsed = batchInventoryMovementSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      Object.values(first).flat()[0] ??
      parsed.error.issues[0]?.message ??
      "Datos inválidos";
    return { success: false as const, error: msg };
  }

  const { supabase, user } = await requireUser();

  const stockOk = await assertLinesDoNotCauseNegativeStock(supabase, parsed.data.lines);
  if (!stockOk.ok) {
    return { success: false as const, error: stockOk.error };
  }

  const movement_date = new Date().toISOString().slice(0, 10);
  const notes = parsed.data.global_notes?.trim() || null;

  let batchRes = await supabase
    .from("inventory_movement_batches")
    .insert({
      movement_date,
      notes,
      created_by_user_id: user.id,
      created_by_email: user.email ?? null,
    })
    .select("id")
    .single();

  if (batchRes.error) {
    batchRes = await supabase
      .from("inventory_movement_batches")
      .insert({
        movement_date,
        notes,
      })
      .select("id")
      .single();
  }

  if (batchRes.error || !batchRes.data) {
    console.error("createMovementsBatch (batch):", batchRes.error);
    return {
      success: false as const,
      error:
        batchRes.error?.message ??
        "No se pudo crear el comprobante. ¿Ejecutaste la migración de inventario?",
    };
  }

  const batchId = (batchRes.data as { id: string }).id;

  const rowsWithUser = parsed.data.lines.map((line) => ({
    batch_id: batchId,
    product_id: line.product_id,
    movement_type: line.movement_type,
    quantity: line.quantity,
    historical_unit_cost: line.historical_unit_cost,
    notes,
    movement_date,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null,
  }));

  let result = await supabase.from("inventory_movements").insert(rowsWithUser);
  if (result.error) {
    const rowsLegacy = parsed.data.lines.map((line) => ({
      batch_id: batchId,
      product_id: line.product_id,
      movement_type: line.movement_type,
      quantity: line.quantity,
      historical_unit_cost: line.historical_unit_cost,
      notes,
      movement_date,
    }));
    result = await supabase.from("inventory_movements").insert(rowsLegacy);
  }
  if (result.error) {
    await supabase.from("inventory_movement_batches").delete().eq("id", batchId);
    return { success: false as const, error: result.error.message };
  }

  const stockApply = await applyStockDeltasForLines(supabase, parsed.data.lines);
  if (!stockApply.ok) {
    await supabase.from("inventory_movements").delete().eq("batch_id", batchId);
    await supabase.from("inventory_movement_batches").delete().eq("id", batchId);
    return { success: false as const, error: stockApply.error };
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const, count: parsed.data.lines.length, batchId };
}

export async function createMovement(data: MovementFormValues) {
  return createMovementsBatch({
    global_notes: typeof data.notes === "string" ? data.notes : "",
    lines: [
      {
        product_id: data.product_id,
        movement_type: data.movement_type,
        quantity: data.quantity,
        historical_unit_cost: data.historical_unit_cost,
      },
    ],
  });
}

export async function deleteMovement(id: string) {
  const { supabase } = await requireUser();
  const { data: row, error: selErr } = await supabase
    .from("inventory_movements")
    .select("product_id, movement_type, quantity, batch_id")
    .eq("id", id)
    .maybeSingle();
  if (selErr) {
    return { success: false as const, error: selErr.message };
  }
  if (!row) {
    return { success: false as const, error: "Movimiento no encontrado" };
  }

  const typed = row as unknown as {
    product_id: string;
    movement_type: string;
    quantity: number;
    batch_id: string | null;
  };

  const { error } = await supabase.from("inventory_movements").delete().eq("id", id);
  if (error) {
    return { success: false as const, error: error.message };
  }

  if (typed.batch_id != null) {
    const rev = await applyStockDeltaToProduct(
      supabase,
      typed.product_id,
      -lineStockDelta({ movement_type: typed.movement_type, quantity: typed.quantity })
    );
    if (!rev.ok) {
      console.error("deleteMovement: no se pudo revertir stock:", rev.error);
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const };
}

/** Elimina un comprobante completo y todas sus líneas (CASCADE). */
export async function deleteInventoryBatch(id: string) {
  if (!id) return { success: false as const, error: "Comprobante inválido" };
  const { supabase } = await requireUser();

  const { data: movements, error: movErr } = await supabase
    .from("inventory_movements")
    .select("product_id, movement_type, quantity")
    .eq("batch_id", id);
  if (movErr) {
    return { success: false as const, error: movErr.message };
  }

  const deltaByProduct = new Map<string, number>();
  for (const m of movements ?? []) {
    const row = m as { product_id: string; movement_type: string; quantity: number };
    const d = lineStockDelta(row);
    deltaByProduct.set(row.product_id, (deltaByProduct.get(row.product_id) ?? 0) + d);
  }

  const { error } = await supabase.from("inventory_movement_batches").delete().eq("id", id);
  if (error) {
    return { success: false as const, error: error.message };
  }

  for (const [productId, sumDelta] of deltaByProduct) {
    const rev = await applyStockDeltaToProduct(supabase, productId, -sumDelta);
    if (!rev.ok) {
      console.error("deleteInventoryBatch: revertir stock:", productId, rev.error);
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const };
}
