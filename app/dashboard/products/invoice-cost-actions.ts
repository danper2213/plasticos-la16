"use server";

import { createPayable } from "@/app/dashboard/payables/actions";
import { payableSchema } from "@/app/dashboard/payables/schema";
import {
  buildDescriptionFingerprint,
  processInvoiceLines,
  type InvoiceCostLearning,
  type InvoiceMatchProduct,
  type ProcessedInvoiceLine,
  type RawInvoiceLine,
} from "@/lib/invoice-cost";
import { detectInvoiceFileMime } from "@/lib/invoice-cost/detect-invoice-file";
import { extractInvoiceLinesFromFile } from "@/lib/invoice-cost/extract-invoice";
import { extractedToRawLines } from "@/lib/invoice-cost/extract-invoice-shared";
import { estimateInvoiceTotalWithIva } from "@/lib/invoice-cost/invoice-total";
import { matchSupplierByName } from "@/lib/invoice-cost/match-supplier";
import { suggestPayableDueDate } from "@/lib/invoice-cost/suggest-payable-due-date";
import { formatDateLongEsCO, todayDateColombia } from "@/lib/calendar-date";
import {
  applySupabaseSearchFilter,
  productAutocompleteSearchFields,
} from "@/lib/supabase-search-filter";
import { requireAdmin } from "@/utils/supabase/require-user";

type LearningRow = {
  id: string;
  supplier_id: string | null;
  description_fingerprint: string;
  sample_description: string;
  product_id: string;
  unidades_por_empaque: number | null;
  confirm_count: number;
  last_unit_cost: number | null;
  updated_at: string;
};

function rowToLearning(row: LearningRow): InvoiceCostLearning {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    descriptionFingerprint: row.description_fingerprint,
    sampleDescription: row.sample_description,
    productId: row.product_id,
    unidadesPorEmpaque: row.unidades_por_empaque,
    confirmCount: row.confirm_count,
    lastUnitCost:
      row.last_unit_cost == null ? null : Number(row.last_unit_cost),
    updatedAt: row.updated_at,
  };
}

/** Carga aprendizajes (opcionalmente filtrados por proveedor). */
export async function listInvoiceCostLearnings(
  supplierId?: string | null,
): Promise<InvoiceCostLearning[]> {
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("invoice_cost_learnings")
    .select(
      "id, supplier_id, description_fingerprint, sample_description, product_id, unidades_por_empaque, confirm_count, last_unit_cost, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (supplierId) {
    query = query.or(`supplier_id.eq.${supplierId},supplier_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as LearningRow[]).map(rowToLearning);
}

async function loadActiveProductsForMatch(): Promise<InvoiceMatchProduct[]> {
  const { supabase } = await requireAdmin();

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

/**
 * Preview: calcula costo unitario, match por similitud y aplica aprendizajes.
 * No escribe en BD.
 */
export async function previewInvoiceCostUpdates(input: {
  lines: RawInvoiceLine[];
  supplierId?: string | null;
}): Promise<ProcessedInvoiceLine[]> {
  await requireAdmin();

  const [products, learnings] = await Promise.all([
    loadActiveProductsForMatch(),
    listInvoiceCostLearnings(input.supplierId),
  ]);

  return processInvoiceLines(input.lines, products, {
    learnings,
    supplierId: input.supplierId ?? null,
  });
}

export type InvoiceExtractMeta = {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTotalConIva: number | null;
  invoiceTotalNeto: number | null;
  lineCount: number;
  fileName: string;
  /** Suma de valorTotalNeto de líneas (para fallback de total). */
  lineNetosSum: number;
};

export type ExtractAndPreviewResult = {
  processed: ProcessedInvoiceLine[];
  meta: InvoiceExtractMeta;
};

export type InvoicePayableDraft = {
  supplierId: string;
  supplierLabel: string | null;
  invoiceNumber: string;
  invoiceAmount: number;
  amountSource: "header_iva" | "header_neto" | "lines_iva";
  receptionDate: string;
  dueDate: string;
  lastDueDate: string | null;
  lastDueDateLabel: string | null;
  suggestedDueDateLabel: string;
  dueDateSource: "after_last" | "fallback_today";
  paymentNote: string;
};

/**
 * Extrae líneas desde PDF/foto con Gemini (usando aprendizajes del proveedor
 * como ejemplos), luego calcula costos y matches para la vista de confirmación.
 */
export async function extractAndPreviewInvoiceCosts(
  formData: FormData,
): Promise<ExtractAndPreviewResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Subí el PDF o la foto de la factura.");
  }

  const supplierIdRaw = String(formData.get("supplierId") ?? "").trim();
  const supplierId = supplierIdRaw || null;

  const detected = await detectInvoiceFileMime(file);
  if (!detected.ok) throw new Error(detected.error);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const [learnings, products] = await Promise.all([
    listInvoiceCostLearnings(supplierId),
    loadActiveProductsForMatch(),
  ]);

  const extracted = await extractInvoiceLinesFromFile({
    bytes,
    mimeType: detected.mime,
    learnings,
  });

  const lines = extractedToRawLines(extracted);
  if (lines.length === 0) {
    throw new Error("No se encontraron líneas de producto en la factura.");
  }

  const processed = processInvoiceLines(lines, products, {
    learnings,
    supplierId,
  });

  const lineNetosSum = lines.reduce((acc, l) => acc + (l.valorTotalNeto || 0), 0);

  return {
    processed,
    meta: {
      supplierName: extracted.supplierName?.trim() || null,
      invoiceNumber: extracted.invoiceNumber?.trim() || null,
      invoiceDate: extracted.invoiceDate?.trim().slice(0, 10) || null,
      invoiceTotalConIva:
        extracted.invoiceTotalConIva != null
          ? Number(extracted.invoiceTotalConIva)
          : null,
      invoiceTotalNeto:
        extracted.invoiceTotalNeto != null
          ? Number(extracted.invoiceTotalNeto)
          : null,
      lineCount: lines.length,
      fileName: file.name,
      lineNetosSum,
    },
  };
}

/**
 * Arma el borrador de CxP: proveedor, total, recepción y día sugerido
 * (siguiente al de la última factura del calendario).
 */
export async function prepareInvoicePayableDraft(input: {
  supplierId?: string | null;
  meta: Pick<
    InvoiceExtractMeta,
    | "supplierName"
    | "invoiceNumber"
    | "invoiceDate"
    | "invoiceTotalConIva"
    | "invoiceTotalNeto"
    | "lineNetosSum"
  >;
}): Promise<InvoicePayableDraft> {
  const { supabase } = await requireAdmin();

  const { data: suppliers, error: suppliersError } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (suppliersError) throw new Error(suppliersError.message);

  const supplierOptions = (suppliers ?? []) as { id: string; name: string }[];

  let supplierId = (input.supplierId ?? "").trim();
  let supplierLabel: string | null = null;

  if (supplierId) {
    const found = supplierOptions.find((s) => s.id === supplierId);
    supplierLabel = found?.name ?? null;
  } else {
    const matched = matchSupplierByName(input.meta.supplierName, supplierOptions);
    if (matched) {
      supplierId = matched.id;
      supplierLabel = matched.name;
    }
  }

  const total = estimateInvoiceTotalWithIva({
    headerTotalWithIva: input.meta.invoiceTotalConIva,
    headerTotalNeto: input.meta.invoiceTotalNeto,
    lineNetos: [input.meta.lineNetosSum],
  });

  const { data: lastRows, error: lastError } = await supabase
    .from("accounts_payable")
    .select("due_date")
    .not("due_date", "is", "null")
    .order("due_date", { ascending: false })
    .limit(40);

  if (lastError) throw new Error(lastError.message);

  const suggestion = suggestPayableDueDate(
    (lastRows ?? []).map((r) => r.due_date as string | null),
    todayDateColombia(),
  );

  const receptionDate =
    input.meta.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(input.meta.invoiceDate)
      ? input.meta.invoiceDate
      : todayDateColombia();

  return {
    supplierId,
    supplierLabel,
    invoiceNumber: (input.meta.invoiceNumber ?? "").trim(),
    invoiceAmount: total.amount,
    amountSource: total.source,
    receptionDate,
    dueDate: suggestion.suggestedDueDate,
    lastDueDate: suggestion.lastDueDate,
    lastDueDateLabel: suggestion.lastDueDate
      ? formatDateLongEsCO(suggestion.lastDueDate)
      : null,
    suggestedDueDateLabel: formatDateLongEsCO(suggestion.suggestedDueDate),
    dueDateSource: suggestion.source,
    paymentNote: "",
  };
}

/** Registra la factura en cuentas por pagar tras verificar cabecera. */
export async function registerInvoicePayable(input: unknown): Promise<{
  success: true;
} | { success: false; error: string }> {
  await requireAdmin();
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(" · "),
    };
  }
  return createPayable(parsed.data);
}

/** Búsqueda rápida para corregir match en la vista de confirmación. */
export async function searchProductsForInvoiceMatch(
  query: string,
): Promise<InvoiceMatchProduct[]> {
  const { supabase } = await requireAdmin();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  let q = supabase
    .from("products")
    .select("id, name, presentation, packaging, cost, supplier_id")
    .eq("is_active", true);

  q = applySupabaseSearchFilter(q, trimmed, productAutocompleteSearchFields);

  const { data, error } = await q.limit(20);
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

export interface ConfirmInvoiceCostLineInput {
  descripcion: string;
  productId: string;
  unidadesPorEmpaque: number;
  unitCost: number;
  costBasis?: "metraje" | "unidad";
  /** Si true, actualiza products.cost al valor de la factura (alza o baja). */
  applyCostUpdate: boolean;
}

/**
 * Confirma líneas: refuerza aprendizaje y, si aplica, actualiza el costo
 * del producto (alza o baja, según lo que el usuario marcó).
 */
export async function confirmInvoiceCostUpdates(input: {
  supplierId?: string | null;
  lines: ConfirmInvoiceCostLineInput[];
}): Promise<{ updatedCosts: number; learningsUpserted: number }> {
  const { supabase } = await requireAdmin();
  const supplierId = input.supplierId ?? null;

  let updatedCosts = 0;
  let learningsUpserted = 0;

  for (const line of input.lines) {
    const fingerprint = buildDescriptionFingerprint(
      line.descripcion,
      supplierId,
    );

    const { data: existing } = await supabase
      .from("invoice_cost_learnings")
      .select("id, confirm_count")
      .eq("description_fingerprint", fingerprint)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("invoice_cost_learnings")
        .update({
          sample_description: line.descripcion,
          product_id: line.productId,
          unidades_por_empaque: line.unidadesPorEmpaque,
          confirm_count: (existing.confirm_count ?? 1) + 1,
          last_unit_cost: line.unitCost,
          updated_at: new Date().toISOString(),
          supplier_id: supplierId,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("invoice_cost_learnings").insert({
        supplier_id: supplierId,
        description_fingerprint: fingerprint,
        sample_description: line.descripcion,
        product_id: line.productId,
        unidades_por_empaque: line.unidadesPorEmpaque,
        confirm_count: 1,
        last_unit_cost: line.unitCost,
      });
      if (error) throw new Error(error.message);
    }

    learningsUpserted += 1;

    if (!line.applyCostUpdate) continue;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, cost")
      .eq("id", line.productId)
      .maybeSingle();

    if (productError) throw new Error(productError.message);
    if (!product) continue;

    const currentCost = Math.round(Number(product.cost ?? 0) * 100) / 100;
    const nextCost = Math.round(line.unitCost * 100) / 100;
    if (!(nextCost > 0) || nextCost === currentCost) continue;

    const { error: updateError } = await supabase
      .from("products")
      .update({
        cost: nextCost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.productId);

    if (updateError) throw new Error(updateError.message);
    updatedCosts += 1;
  }

  return { updatedCosts, learningsUpserted };
}
