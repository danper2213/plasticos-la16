"use server";

import { z } from "zod";
import { requireUser } from "@/utils/supabase/require-user";
import { detectInvoiceFileMime } from "@/lib/invoice-cost/detect-invoice-file";
import { extractInventorySheetFromFile } from "@/lib/inventory-sheet/extract-sheet";
import {
  formatCodeFromId,
  normalizeFormatCode,
} from "@/lib/inventory-sheet/format-code";
import {
  mapExtractedSheetToConfirmRows,
  type FormatSheetLine,
  type SheetConfirmRow,
} from "@/lib/inventory-sheet/map-extracted-lines";
import type { InvoiceMatchProduct } from "@/lib/invoice-cost/match-products";
import { toStockNumber } from "@/lib/inventory-quantity";
import { createMovementsBatch } from "@/app/dashboard/inventory/actions";
import type { MovementType } from "@/app/dashboard/inventory/schema";
import { defaultQuantityUnit } from "@/lib/inventory-quantity-unit";

export type InventorySheetFormatListItem = {
  id: string;
  code: string;
  name: string;
  defaultMovementType: "in" | "out" | null;
  lineCount: number;
  updatedAt: string;
};

export type InventorySheetFormatDetail = {
  id: string;
  code: string;
  name: string;
  defaultMovementType: "in" | "out" | null;
  notes: string | null;
  lines: Array<{
    id: string;
    productId: string;
    sortOrder: number;
    name: string;
    presentation: string | null;
    packaging: string | null;
    supplierName: string | null;
    cost: number;
    stockQuantity: number | null;
  }>;
};

const formatSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Indicá un nombre").max(120),
  defaultMovementType: z.enum(["in", "out"]).nullable(),
  notes: z.string().max(500).nullable(),
  productIds: z.array(z.string().uuid()).min(1, "Agregá al menos un producto"),
});

async function loadCatalog(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
): Promise<InvoiceMatchProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, presentation, packaging, cost, supplier_id")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    presentation: (row.presentation as string | null) ?? null,
    packaging: (row.packaging as string | null) ?? null,
    cost: Number(row.cost ?? 0),
    supplier_id: (row.supplier_id as string | null) ?? null,
  }));
}

export async function listInventorySheetFormats(): Promise<InventorySheetFormatListItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("inventory_sheet_formats")
    .select("id, code, name, default_movement_type, updated_at, inventory_sheet_format_lines(id)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      code: string;
      name: string;
      default_movement_type: "in" | "out" | null;
      updated_at: string;
      inventory_sheet_format_lines: { id: string }[] | null;
    };
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      defaultMovementType: r.default_movement_type,
      lineCount: r.inventory_sheet_format_lines?.length ?? 0,
      updatedAt: r.updated_at,
    };
  });
}

export async function getInventorySheetFormat(
  id: string,
): Promise<InventorySheetFormatDetail | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("inventory_sheet_formats")
    .select(
      "id, code, name, default_movement_type, notes, inventory_sheet_format_lines ( id, product_id, sort_order, products ( id, name, presentation, packaging, cost, stock_quantity, suppliers ( name ) ) )",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const r = data as unknown as {
    id: string;
    code: string;
    name: string;
    default_movement_type: "in" | "out" | null;
    notes: string | null;
    inventory_sheet_format_lines: Array<{
      id: string;
      product_id: string;
      sort_order: number;
      products:
        | {
            id: string;
            name: string;
            presentation: string | null;
            packaging: string | null;
            cost: number | null;
            stock_quantity: number | null;
            suppliers: { name: string } | { name: string }[] | null;
          }
        | {
            id: string;
            name: string;
            presentation: string | null;
            packaging: string | null;
            cost: number | null;
            stock_quantity: number | null;
            suppliers: { name: string } | { name: string }[] | null;
          }[]
        | null;
    }>;
  };

  const lines = [...(r.inventory_sheet_format_lines ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((line) => {
      const p = Array.isArray(line.products) ? line.products[0] : line.products;
      const supplierRel = p?.suppliers;
      const supplier = Array.isArray(supplierRel) ? supplierRel[0] : supplierRel;
      return {
        id: line.id,
        productId: line.product_id,
        sortOrder: line.sort_order,
        name: p?.name ?? "Producto",
        presentation: p?.presentation ?? null,
        packaging: p?.packaging ?? null,
        supplierName: supplier?.name?.trim() || null,
        cost: Number(p?.cost ?? 0),
        stockQuantity:
          p?.stock_quantity == null ? null : toStockNumber(p.stock_quantity),
      };
    });

  return {
    id: r.id,
    code: r.code,
    name: r.name,
    defaultMovementType: r.default_movement_type,
    notes: r.notes,
    lines,
  };
}

export async function saveInventorySheetFormat(input: {
  id?: string;
  name: string;
  defaultMovementType: "in" | "out" | null;
  notes?: string | null;
  productIds: string[];
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = formatSaveSchema.safeParse({
    ...input,
    notes: input.notes?.trim() || null,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const uniqueIds = [...new Set(parsed.data.productIds)];
  const { supabase, user } = await requireUser();

  if (parsed.data.id) {
    const { error: upErr } = await supabase
      .from("inventory_sheet_formats")
      .update({
        name: parsed.data.name,
        default_movement_type: parsed.data.defaultMovementType,
        notes: parsed.data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id);
    if (upErr) return { success: false, error: upErr.message };

    const { error: delErr } = await supabase
      .from("inventory_sheet_format_lines")
      .delete()
      .eq("format_id", parsed.data.id);
    if (delErr) return { success: false, error: delErr.message };

    const { error: insErr } = await supabase.from("inventory_sheet_format_lines").insert(
      uniqueIds.map((productId, sortOrder) => ({
        format_id: parsed.data.id,
        product_id: productId,
        sort_order: sortOrder,
      })),
    );
    if (insErr) return { success: false, error: insErr.message };
    return { success: true, id: parsed.data.id };
  }

  const id = crypto.randomUUID();
  const { error: createErr } = await supabase.from("inventory_sheet_formats").insert({
    id,
    code: formatCodeFromId(id),
    name: parsed.data.name,
    default_movement_type: parsed.data.defaultMovementType,
    notes: parsed.data.notes,
    created_by_user_id: user.id,
  });
  if (createErr) return { success: false, error: createErr.message };

  const { error: linesErr } = await supabase.from("inventory_sheet_format_lines").insert(
    uniqueIds.map((productId, sortOrder) => ({
      format_id: id,
      product_id: productId,
      sort_order: sortOrder,
    })),
  );
  if (linesErr) return { success: false, error: linesErr.message };
  return { success: true, id };
}

export async function deleteInventorySheetFormat(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("inventory_sheet_formats").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

async function formatLinesForMap(
  detail: InventorySheetFormatDetail,
): Promise<FormatSheetLine[]> {
  return detail.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    presentation: l.presentation,
    packaging: l.packaging,
    cost: l.cost,
    stockQuantity: l.stockQuantity,
    sortOrder: l.sortOrder,
  }));
}

export type InventorySheetExtractResult = {
  formatId: string | null;
  formatCode: string | null;
  formatName: string | null;
  movementType: "in" | "out" | null;
  sheetDate: string | null;
  notes: string | null;
  rows: SheetConfirmRow[];
};

export async function extractAndPreviewInventorySheet(formData: FormData): Promise<
  { success: true; data: InventorySheetExtractResult } | { success: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Seleccioná una foto o PDF." };
  }

  const mime = await detectInvoiceFileMime(file);
  if (!mime.ok) return { success: false, error: mime.error };

  const formatIdRaw = String(formData.get("formatId") ?? "").trim();
  const { supabase } = await requireUser();

  let formatDetail: InventorySheetFormatDetail | null = null;
  if (formatIdRaw) {
    formatDetail = await getInventorySheetFormat(formatIdRaw);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let extracted;
  try {
    extracted = await extractInventorySheetFromFile({
      bytes,
      mimeType: mime.mime,
      formatHint: formatDetail
        ? {
            code: formatDetail.code,
            name: formatDetail.name,
            lines: formatDetail.lines.map((l, i) => ({
              rowIndex: i + 1,
              productLabel: [l.name, l.supplierName, l.presentation, l.packaging]
                .filter(Boolean)
                .join(" · "),
            })),
          }
        : null,
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo leer la hoja.",
    };
  }

  const extractedCode = normalizeFormatCode(extracted.formatCode);
  if (!formatDetail && extractedCode) {
    const { data: byCode } = await supabase
      .from("inventory_sheet_formats")
      .select("id")
      .eq("code", extractedCode)
      .maybeSingle();
    const foundId = (byCode as { id: string } | null)?.id;
    if (foundId) formatDetail = await getInventorySheetFormat(foundId);
  }

  const catalog = await loadCatalog(supabase);
  const formatLines = formatDetail ? await formatLinesForMap(formatDetail) : [];
  const rows = mapExtractedSheetToConfirmRows({
    extractedLines: extracted.lines,
    formatLines,
    catalog,
  });

  const stockIds = [...new Set(rows.map((r) => r.productId).filter(Boolean))] as string[];
  if (stockIds.length > 0) {
    const { data: stockRows } = await supabase
      .from("products")
      .select("id, stock_quantity")
      .in("id", stockIds);
    const stockById: Record<string, number | null> = {};
    for (const row of stockRows ?? []) {
      const r = row as { id: string; stock_quantity: number | null };
      stockById[r.id] = r.stock_quantity == null ? null : toStockNumber(r.stock_quantity);
    }
    for (const row of rows) {
      if (row.productId && stockById[row.productId] !== undefined) {
        row.stockQuantity = stockById[row.productId] ?? null;
      }
    }
  }

  return {
    success: true,
    data: {
      formatId: formatDetail?.id ?? null,
      formatCode: formatDetail?.code ?? extractedCode,
      formatName: formatDetail?.name ?? null,
      movementType:
        extracted.movementType === "in" || extracted.movementType === "out"
          ? extracted.movementType
          : formatDetail?.defaultMovementType ?? null,
      sheetDate: extracted.sheetDate ?? null,
      notes: extracted.notes ?? null,
      rows,
    },
  };
}

const confirmLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  quantity_unit: z.enum(["pack", "unit"]),
  historical_unit_cost: z.number().min(0),
});

const confirmSchema = z.object({
  movementType: z.enum(["in", "out"]),
  notes: z.string().max(500).optional().nullable(),
  lines: z.array(confirmLineSchema).min(1, "Marcá al menos un producto con cantidad"),
});

export async function confirmInventorySheet(input: {
  movementType: MovementType;
  notes?: string | null;
  lines: Array<{
    product_id: string;
    quantity: number;
    quantity_unit: "pack" | "unit";
    historical_unit_cost: number;
  }>;
}) {
  if (input.movementType !== "in" && input.movementType !== "out") {
    return { success: false as const, error: "Elegí Entrada o Salida." };
  }
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const seen = new Set<string>();
  const lines = [];
  for (const line of parsed.data.lines) {
    if (seen.has(line.product_id)) {
      return {
        success: false as const,
        error: "Hay productos duplicados. Unificá cantidades o quitá la línea extra.",
      };
    }
    seen.add(line.product_id);
    lines.push({
      product_id: line.product_id,
      movement_type: parsed.data.movementType,
      quantity: line.quantity,
      quantity_unit: line.quantity_unit ?? defaultQuantityUnit(null),
      historical_unit_cost: line.historical_unit_cost,
    });
  }

  return createMovementsBatch({
    global_notes: parsed.data.notes?.trim() || "",
    lines,
    idempotency_key: crypto.randomUUID(),
  });
}
