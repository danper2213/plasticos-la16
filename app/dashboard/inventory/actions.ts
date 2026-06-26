"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
import { queryActiveProductsWithSearch } from "@/lib/query-active-products";
import { productAutocompleteSearchFields } from "@/lib/supabase-search-filter";
import {
  batchInventoryMovementSchema,
  type BatchInventoryMovementFormValues,
  type MovementFormValues,
  type MovementLineFormValues,
} from "./schema";
import { lineStockDelta } from "@/lib/inventory-stock-delta";
import { toStockNumber } from "@/lib/inventory-quantity";
import { buildLinePreviews } from "@/lib/inventory-movement-preview";

function inventoryStockLog(message: string, detail?: Record<string, unknown>): string {
  const line = detail ? `${message} ${JSON.stringify(detail)}` : message;
  console.log(`[inventory-stock] ${line}`);
  return line;
}

async function countMovementsForBatch(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  batchId: string,
): Promise<number> {
  const { count } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true })
    .eq("batch_id", batchId);
  return count ?? 0;
}

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
  supplier_id: string | null;
  supplier_name: string | null;
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

export async function getProductStockQuantity(
  productId: string,
): Promise<number | null> {
  if (!productId) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .maybeSingle();
  if (error || !data) return null;
  const raw = (data as { stock_quantity: number | null }).stock_quantity;
  return raw == null ? null : toStockNumber(raw);
}

/** Búsqueda de productos por nombre para el registro de movimientos. */
export async function searchProductsForMovement(query: string): Promise<ProductSearchHit[]> {
  const { supabase } = await requireUser();
  return queryActiveProductsWithSearch(supabase, query, {
    select: "id, name, presentation, packaging, cost, stock_quantity, supplier_id, suppliers ( name )",
    limit: 20,
    resolveFields: productAutocompleteSearchFields,
    mapRow: (row) => {
      const supplier = row.suppliers as { name?: string } | { name?: string }[] | null;
      const supplierName = Array.isArray(supplier) ? supplier[0]?.name : supplier?.name;
      return {
        id: row.id as string,
        name: row.name as string,
        presentation: row.presentation as string,
        packaging: (row.packaging as string | null) ?? null,
        cost: row.cost as number,
        stock_quantity:
          row.stock_quantity == null ? null : toStockNumber(row.stock_quantity),
        supplier_id: (row.supplier_id as string | null) ?? null,
        supplier_name: supplierName?.trim() || null,
      } satisfies ProductSearchHit;
    },
  });
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
  const rows = (products ?? []) as {
    id: string;
    name: string;
    stock_quantity: number | null;
  }[];
  if (rows.length !== ids.length) {
    return { ok: false, error: "No se encontraron todos los productos para validar stock." };
  }
  const stockById = new Map(rows.map((p) => [p.id, p]));

  const stockByProductId: Record<string, number | null> = {};
  for (const p of rows) {
    stockByProductId[p.id] =
      p.stock_quantity == null ? null : toStockNumber(p.stock_quantity);
  }

  const previews = buildLinePreviews(lines, stockByProductId);
  for (const [id, stock] of Object.entries(stockByProductId)) {
    inventoryStockLog("validación stock (servidor)", {
      productId: id,
      stockEnBD: stock,
    });
  }
  const violatingIndex = previews.findIndex(
    (p, i) => p.violates && lines[i]?.product_id,
  );
  if (violatingIndex >= 0) {
    const violating = previews[violatingIndex]!;
    const badLine = lines[violatingIndex];
    const info = stockById.get(badLine?.product_id ?? "");
    return {
      ok: false,
      error: `Stock insuficiente para «${info?.name ?? "producto"}»: el saldo quedaría en ${violating.balanceAfter} unidades.`,
    };
  }
  return { ok: true };
}

async function applyInventoryStockDelta(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  productId: string,
  inventoryDelta: number,
): Promise<
  { ok: true; stockBefore: number; stockAfter: number } | { ok: false; error: string }
> {
  const { data: row, error: selErr } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  if (!row) return { ok: false, error: `Producto ${productId} no encontrado` };

  const stockBefore = toStockNumber(
    (row as { stock_quantity: number | null }).stock_quantity,
  );

  inventoryStockLog("applyDelta", {
    productId,
    stockBefore,
    delta: inventoryDelta,
    formula: `${stockBefore} + (${inventoryDelta})`,
  });

  const rpc = await supabase.rpc("adjust_product_stock", {
    p_product_id: productId,
    p_delta: inventoryDelta,
  });

  if (!rpc.error) {
    if (rpc.data != null) {
      const stockAfter = toStockNumber(rpc.data);
      inventoryStockLog("applyDelta OK (rpc)", { productId, stockBefore, stockAfter, delta: inventoryDelta });
      return {
        ok: true,
        stockBefore,
        stockAfter,
      };
    }
    const { data: afterRow, error: afterErr } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .maybeSingle();
    if (afterErr || !afterRow) {
      return { ok: false, error: afterErr?.message ?? "No se pudo leer el stock actualizado" };
    }
    const stockAfter = toStockNumber(
      (afterRow as { stock_quantity: number | null }).stock_quantity,
    );
    inventoryStockLog("applyDelta OK (re-read)", { productId, stockBefore, stockAfter, delta: inventoryDelta });
    return {
      ok: true,
      stockBefore,
      stockAfter,
    };
  }

  inventoryStockLog("applyDelta FALLÓ (rpc)", {
    productId,
    error: rpc.error.message,
    hint: "¿Ejecutaste adjust_product_stock en Supabase?",
  });

  return {
    ok: false,
    error:
      "No se pudo actualizar el stock. Ejecutá en Supabase la migración adjust_product_stock (20260529120000).",
  };
}

async function applyStockDeltasForLines(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  lines: MovementLineFormValues[],
): Promise<
  | { ok: true; updates: Array<{ productId: string; stockBefore: number; stockAfter: number; delta: number }> }
  | { ok: false; error: string }
> {
  const deltaByProduct = new Map<string, number>();
  for (const line of lines) {
    const d = lineStockDelta(line);
    deltaByProduct.set(line.product_id, (deltaByProduct.get(line.product_id) ?? 0) + d);
  }

  const updates: Array<{ productId: string; stockBefore: number; stockAfter: number; delta: number }> = [];
  for (const [productId, invDelta] of deltaByProduct) {
    const r = await applyInventoryStockDelta(supabase, productId, invDelta);
    if (!r.ok) return r;
    updates.push({
      productId,
      stockBefore: r.stockBefore,
      stockAfter: r.stockAfter,
      delta: invDelta,
    });
  }
  return { ok: true, updates };
}

async function resolveExistingIdempotentBatch(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  idempotencyKey: string,
  productIds: string[],
) {
  const { data: batch, error } = await supabase
    .from("inventory_movement_batches")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error || !batch) return null;

  const batchId = (batch as { id: string }).id;
  const { count } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true })
    .eq("batch_id", batchId);

  const uniqueProductIds = [...new Set(productIds)];
  const stockUpdates: Array<{ productId: string; stockBefore: number; stockAfter: number; delta: number }> =
    [];
  for (const productId of uniqueProductIds) {
    const { data: row } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .maybeSingle();
    const stock = toStockNumber(
      (row as { stock_quantity: number | null } | null)?.stock_quantity,
    );
    stockUpdates.push({ productId, stockBefore: stock, stockAfter: stock, delta: 0 });
  }

  return {
    success: true as const,
    count: count ?? 0,
    batchId,
    stockUpdates,
    deduplicated: true as const,
  };
}

export async function createMovementsBatch(data: BatchInventoryMovementFormValues) {
  const debugLog: string[] = [];
  const dbg = (message: string, detail?: Record<string, unknown>) => {
    debugLog.push(inventoryStockLog(message, detail));
  };

  const parsed = batchInventoryMovementSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      Object.values(first).flat()[0] ??
      parsed.error.issues[0]?.message ??
      "Datos inválidos";
    return { success: false as const, error: msg, debugLog };
  }

  dbg("createMovementsBatch inicio", {
    idempotency_key: parsed.data.idempotency_key ?? null,
    lineCount: parsed.data.lines.length,
    lines: parsed.data.lines.map((l) => ({
      product_id: l.product_id,
      type: l.movement_type,
      qty: l.quantity,
      delta: lineStockDelta(l),
    })),
  });

  const { supabase, user } = await requireUser();

  const idempotencyKey = parsed.data.idempotency_key?.trim() || null;
  const productIds = parsed.data.lines.map((l) => l.product_id);
  if (idempotencyKey) {
    const existing = await resolveExistingIdempotentBatch(
      supabase,
      idempotencyKey,
      productIds,
    );
    if (existing) {
      dbg("idempotencia: lote ya existía, no se vuelve a tocar stock", {
        batchId: existing.batchId,
        count: existing.count,
      });
      return { ...existing, debugLog };
    }
  }

  const stockOk = await assertLinesDoNotCauseNegativeStock(supabase, parsed.data.lines);
  if (!stockOk.ok) {
    return { success: false as const, error: stockOk.error, debugLog };
  }

  const movement_date = new Date().toISOString().slice(0, 10);
  const notes = parsed.data.global_notes?.trim() || null;

  let batchRes = await supabase
    .from("inventory_movement_batches")
    .insert({
      movement_date,
      notes,
      idempotency_key: idempotencyKey,
      created_by_user_id: user.id,
      created_by_email: user.email ?? null,
    })
    .select("id")
    .single();

  if (batchRes.error?.code === "23505" && idempotencyKey) {
    const existing = await resolveExistingIdempotentBatch(
      supabase,
      idempotencyKey,
      productIds,
    );
    if (existing) return { ...existing, debugLog };
  }

  if (batchRes.error) {
    batchRes = await supabase
      .from("inventory_movement_batches")
      .insert({
        movement_date,
        notes,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
  }

  if (batchRes.error?.code === "23505" && idempotencyKey) {
    const existing = await resolveExistingIdempotentBatch(
      supabase,
      idempotencyKey,
      productIds,
    );
    if (existing) return { ...existing, debugLog };
  }

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
    dbg("error creando lote", { message: batchRes.error?.message });
    return {
      success: false as const,
      error:
        batchRes.error?.message ??
        "No se pudo crear el comprobante. ¿Ejecutaste la migración de inventario?",
      debugLog,
    };
  }

  const batchId = (batchRes.data as { id: string }).id;
  dbg("lote creado", { batchId });

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
    const existingCount = await countMovementsForBatch(supabase, batchId);
    dbg("insert movimientos (con usuario) falló", {
      error: result.error.message,
      filasYaEnLote: existingCount,
    });
    if (existingCount === 0) {
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
      dbg("insert movimientos (legacy)", {
        ok: !result.error,
        error: result.error?.message ?? null,
      });
    } else {
      dbg("NO reinsertamos: el lote ya tiene movimientos (evita duplicar stock)");
    }
  }

  const movementRowCount = await countMovementsForBatch(supabase, batchId);
  dbg("filas en inventory_movements para este lote", {
    batchId,
    count: movementRowCount,
    esperadas: parsed.data.lines.length,
  });
  if (movementRowCount > parsed.data.lines.length) {
    dbg("⚠️ MÁS FILAS QUE LÍNEAS ENVIADAS — revisá triggers o inserts duplicados en Supabase");
  }

  for (const line of parsed.data.lines) {
    const { data: midRow } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", line.product_id)
      .maybeSingle();
    const stockTrasInsert = toStockNumber(
      (midRow as { stock_quantity: number | null } | null)?.stock_quantity,
    );
    dbg("stock tras INSERT movimiento (antes de applyDelta)", {
      productId: line.product_id,
      stockEnBD: stockTrasInsert,
      nota: "Si cambió sin applyDelta, hay trigger en Supabase",
    });
  }

  if (result.error && movementRowCount === 0) {
    await supabase.from("inventory_movement_batches").delete().eq("id", batchId);
    return { success: false as const, error: result.error.message, debugLog };
  }

  const stockApply = await applyStockDeltasForLines(supabase, parsed.data.lines);
  if (!stockApply.ok) {
    await supabase.from("inventory_movements").delete().eq("batch_id", batchId);
    await supabase.from("inventory_movement_batches").delete().eq("id", batchId);
    return { success: false as const, error: stockApply.error, debugLog };
  }

  for (const u of stockApply.updates) {
    const { data: verifyRow } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", u.productId)
      .maybeSingle();
    const actualStock = toStockNumber(
      (verifyRow as { stock_quantity: number | null } | null)?.stock_quantity,
    );
    dbg("verificación stock en BD", {
      productId: u.productId,
      esperadoTrasApp: u.stockAfter,
      actualEnBD: actualStock,
      deltaAplicadoPorApp: u.delta,
    });
    if (Math.abs(actualStock - u.stockAfter) > 1e-6) {
      dbg("⚠️ STOCK EN BD ≠ LO CALCULADO POR LA APP", {
        diferencia: actualStock - u.stockAfter,
        causaProbable:
          "Trigger en Supabase que también mueve stock al insertar inventory_movements. Ejecutá 20260529140000_drop_inventory_stock_triggers.sql",
      });
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  dbg("createMovementsBatch OK", {
    batchId,
    stockUpdates: stockApply.updates,
  });
  return {
    success: true as const,
    count: parsed.data.lines.length,
    batchId,
    stockUpdates: stockApply.updates,
    debugLog,
  };
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
    const revDelta = -lineStockDelta({
      movement_type: typed.movement_type,
      quantity: typed.quantity,
    });
    const rev = await applyInventoryStockDelta(supabase, typed.product_id, revDelta);
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
    const rev = await applyInventoryStockDelta(supabase, productId, -sumDelta);
    if (!rev.ok) {
      console.error("deleteInventoryBatch: revertir stock:", productId, rev.error);
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const };
}
