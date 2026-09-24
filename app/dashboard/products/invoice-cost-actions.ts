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
import {
  resolveInvoiceIvaInclusion,
  type InvoiceIvaInclusion,
  type InvoiceIvaSource,
} from "@/lib/invoice-cost/resolve-invoice-iva";
import { matchSupplierByName } from "@/lib/invoice-cost/match-supplier";
import { suggestPayableDueDate } from "@/lib/invoice-cost/suggest-payable-due-date";
import { formatDateLongEsCO, todayDateColombia } from "@/lib/calendar-date";
import {
  applySupabaseSearchFilter,
  productAutocompleteSearchFields,
} from "@/lib/supabase-search-filter";
import { geminiUserFacingMessage } from "@/lib/gemini-errors";
import { requireAdmin } from "@/utils/supabase/require-user";

export type InvoiceCostActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function publicActionError(error: unknown, fallback: string): string {
  return geminiUserFacingMessage(error, fallback);
}

function invoiceFileFromFormData(formData: FormData): File | null {
  const raw = formData.get("file");
  if (raw instanceof File && raw.size > 0) return raw;
  if (raw instanceof Blob && raw.size > 0) {
    return new File([raw], "factura", {
      type: raw.type || "application/octet-stream",
    });
  }
  return null;
}

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

const PRODUCTS_MATCH_SELECT =
  "id, name, presentation, packaging, cost, supplier_id, suppliers ( name )";

function nestedName(
  value: { name?: string } | { name?: string }[] | null | undefined,
): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  const name = row?.name?.trim();
  return name || null;
}

type ProductMatchRow = {
  id: unknown;
  name: unknown;
  presentation: unknown;
  packaging: unknown;
  cost: unknown;
  supplier_id: unknown;
  suppliers?: { name?: string } | { name?: string }[] | null;
};

function mapProductMatchRow(row: ProductMatchRow): InvoiceMatchProduct {
  return {
    id: row.id as string,
    name: row.name as string,
    presentation: (row.presentation as string | null) ?? null,
    packaging: (row.packaging as string | null) ?? null,
    cost: Number(row.cost ?? 0),
    supplier_id: (row.supplier_id as string | null) ?? null,
    supplier_name: nestedName(row.suppliers),
  };
}

async function loadActiveProductsForMatch(): Promise<InvoiceMatchProduct[]> {
  const { supabase } = await requireAdmin();
  const pageSize = 1000;
  const products: InvoiceMatchProduct[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCTS_MATCH_SELECT)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const chunk = (data ?? []).map((row) =>
      mapProductMatchRow(row as unknown as ProductMatchRow),
    );
    products.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return products;
}

/**
 * Preview: calcula costo unitario, match por similitud y aplica aprendizajes.
 * No escribe en BD.
 */
export async function previewInvoiceCostUpdates(input: {
  lines: RawInvoiceLine[];
  supplierId?: string | null;
}): Promise<InvoiceCostActionResult<ProcessedInvoiceLine[]>> {
  await requireAdmin();

  try {
    const [products, learnings] = await Promise.all([
      loadActiveProductsForMatch(),
      listInvoiceCostLearnings(input.supplierId),
    ]);

    return {
      success: true,
      data: processInvoiceLines(input.lines, products, {
        learnings,
        supplierId: input.supplierId ?? null,
      }),
    };
  } catch (error) {
    console.error("[previewInvoiceCostUpdates]", error);
    return {
      success: false,
      error: publicActionError(error, "No se pudieron calcular los costos."),
    };
  }
}

export type InvoiceExtractMeta = {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTotalConIva: number | null;
  invoiceTotalNeto: number | null;
  invoiceTotalIva: number | null;
  lineCount: number;
  fileName: string;
  /** Suma de VR TOTAL de líneas tal como aparecen. */
  lineNetosSum: number;
  ivaInclusion: InvoiceIvaInclusion;
  ivaInclusionSource: InvoiceIvaSource;
  extractionSource: "local" | "gemini";
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
  amountSource: "header_iva" | "header_neto" | "lines_iva" | "lines_neto";
  receptionDate: string;
  dueDate: string;
  lastDueDate: string | null;
  lastDueDateLabel: string | null;
  suggestedDueDateLabel: string;
  dueDateSource: "after_last" | "fallback_today";
  paymentNote: string;
};

/**
 * Extrae líneas desde PDF (texto local, o Gemini si es foto/escaneo) y
 * calcula costos y matches para la vista de confirmación.
 */
export async function extractAndPreviewInvoiceCosts(
  formData: FormData,
): Promise<InvoiceCostActionResult<ExtractAndPreviewResult>> {
  await requireAdmin();

  try {
    const file = invoiceFileFromFormData(formData);
    if (!file) {
      return {
        success: false,
        error: "Subí el PDF o la foto de la factura.",
      };
    }

    const supplierIdRaw = String(formData.get("supplierId") ?? "").trim();
    const supplierId = supplierIdRaw || null;

    const detected = await detectInvoiceFileMime(file);
    if (!detected.ok) return { success: false, error: detected.error };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const [learnings, products] = await Promise.all([
      listInvoiceCostLearnings(supplierId),
      loadActiveProductsForMatch(),
    ]);

    const extractedResult = await extractInvoiceLinesFromFile({
      bytes,
      mimeType: detected.mime,
      learnings,
    });
    const extracted = extractedResult.invoice;

    const lines = extractedToRawLines(extracted);
    if (lines.length === 0) {
      return {
        success: false,
        error: "No se encontraron líneas de producto en la factura.",
      };
    }

    const invoiceTotalConIva =
      extracted.invoiceTotalConIva != null
        ? Number(extracted.invoiceTotalConIva)
        : null;
    const invoiceTotalNeto =
      extracted.invoiceTotalNeto != null
        ? Number(extracted.invoiceTotalNeto)
        : null;
    const invoiceTotalIva =
      extracted.invoiceTotalIva != null
        ? Number(extracted.invoiceTotalIva)
        : null;

    const iva = resolveInvoiceIvaInclusion({
      headerTotalWithIva: invoiceTotalConIva,
      headerTotalNeto: invoiceTotalNeto,
      headerIvaAmount: invoiceTotalIva,
      lineTotals: lines.map((l) => l.valorTotalNeto),
      lineIvas: lines.map((l) => l.valorIva),
      extractorHint: extracted.lineTotalsIncludeIva,
    });

    const processed = processInvoiceLines(lines, products, {
      learnings,
      supplierId,
      invoiceIvaInclusion: iva.inclusion,
    });

    const lineNetosSum = lines.reduce(
      (acc, l) => acc + (l.valorTotalNeto || 0),
      0,
    );

    return {
      success: true,
      data: {
        processed,
        meta: {
          supplierName: extracted.supplierName?.trim() || null,
          invoiceNumber: extracted.invoiceNumber?.trim() || null,
          invoiceDate: extracted.invoiceDate?.trim().slice(0, 10) || null,
          invoiceTotalConIva,
          invoiceTotalNeto,
          invoiceTotalIva,
          lineCount: lines.length,
          fileName: file.name,
          lineNetosSum,
          ivaInclusion: iva.inclusion,
          ivaInclusionSource: iva.source,
          extractionSource: extractedResult.source,
        },
      },
    };
  } catch (error) {
    console.error("[extractAndPreviewInvoiceCosts]", error);
    return {
      success: false,
      error: publicActionError(error, "No se pudo extraer la factura."),
    };
  }
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
    | "ivaInclusion"
  >;
}): Promise<InvoiceCostActionResult<InvoicePayableDraft>> {
  const { supabase } = await requireAdmin();

  try {
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (suppliersError) {
      return { success: false, error: suppliersError.message };
    }

    const supplierOptions = (suppliers ?? []) as { id: string; name: string }[];

    let supplierId = (input.supplierId ?? "").trim();
    let supplierLabel: string | null = null;

    if (supplierId) {
      const found = supplierOptions.find((s) => s.id === supplierId);
      supplierLabel = found?.name ?? null;
    } else {
      const matched = matchSupplierByName(
        input.meta.supplierName,
        supplierOptions,
      );
      if (matched) {
        supplierId = matched.id;
        supplierLabel = matched.name;
      }
    }

    const total = estimateInvoiceTotalWithIva({
      headerTotalWithIva: input.meta.invoiceTotalConIva,
      headerTotalNeto: input.meta.invoiceTotalNeto,
      lineNetos: [input.meta.lineNetosSum],
      lineTotalsIncludeIva: input.meta.ivaInclusion !== "excluded",
    });

    const { data: lastRows, error: lastError } = await supabase
      .from("accounts_payable")
      .select("due_date")
      .not("due_date", "is", "null")
      .order("due_date", { ascending: false })
      .limit(40);

    if (lastError) {
      return { success: false, error: lastError.message };
    }

    const suggestion = suggestPayableDueDate(
      (lastRows ?? []).map((r) => r.due_date as string | null),
      todayDateColombia(),
    );

    const receptionDate =
      input.meta.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(input.meta.invoiceDate)
        ? input.meta.invoiceDate
        : todayDateColombia();

    return {
      success: true,
      data: {
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
      },
    };
  } catch (error) {
    console.error("[prepareInvoicePayableDraft]", error);
    return {
      success: false,
      error: publicActionError(
        error,
        "No se pudo preparar el registro en CxP",
      ),
    };
  }
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

/** Catálogo activo para búsqueda local al corregir matches. */
export async function listProductsForInvoiceMatch(): Promise<
  InvoiceMatchProduct[]
> {
  try {
    return await loadActiveProductsForMatch();
  } catch (error) {
    console.error("[listProductsForInvoiceMatch]", error);
    return [];
  }
}

/** Búsqueda rápida para corregir match en la vista de confirmación. */
export async function searchProductsForInvoiceMatch(
  query: string,
): Promise<InvoiceMatchProduct[]> {
  const { supabase } = await requireAdmin();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    let q = supabase
      .from("products")
      .select(PRODUCTS_MATCH_SELECT)
      .eq("is_active", true);

    q = applySupabaseSearchFilter(q, trimmed, productAutocompleteSearchFields);

    const { data, error } = await q.limit(20);
    if (error) {
      console.error("[searchProductsForInvoiceMatch]", error);
      return [];
    }

    return (data ?? []).map((row) =>
      mapProductMatchRow(row as unknown as ProductMatchRow),
    );
  } catch (error) {
    console.error("[searchProductsForInvoiceMatch]", error);
    return [];
  }
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
}): Promise<
  InvoiceCostActionResult<{ updatedCosts: number; learningsUpserted: number }>
> {
  const { supabase } = await requireAdmin();
  const supplierId = input.supplierId ?? null;

  try {
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
        if (error) {
          return { success: false, error: error.message };
        }
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
        if (error) {
          return { success: false, error: error.message };
        }
      }

      learningsUpserted += 1;

      if (!line.applyCostUpdate) continue;

      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, cost")
        .eq("id", line.productId)
        .maybeSingle();

      if (productError) {
        return { success: false, error: productError.message };
      }
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

      if (updateError) {
        return { success: false, error: updateError.message };
      }
      updatedCosts += 1;
    }

    return { success: true, data: { updatedCosts, learningsUpserted } };
  } catch (error) {
    console.error("[confirmInvoiceCostUpdates]", error);
    return {
      success: false,
      error: publicActionError(error, "No se pudieron confirmar los costos"),
    };
  }
}
