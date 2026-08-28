import { matchProductsBySimilarity } from "@/lib/invoice-cost/match-products";
import type { InvoiceMatchProduct } from "@/lib/invoice-cost/match-products";
import { defaultQuantityUnit, type QuantityUnit } from "@/lib/inventory-quantity-unit";
import { toStockNumber } from "@/lib/inventory-quantity";
import type { ExtractedSheetLine } from "@/lib/inventory-sheet/extract-sheet-shared";
import { normalizeHandwrittenSheetLines } from "@/lib/inventory-sheet/normalize-handwritten-lines";

export type FormatSheetLine = {
  productId: string;
  name: string;
  presentation: string | null;
  packaging: string | null;
  cost: number;
  stockQuantity: number | null;
  sortOrder: number;
};

export type SheetConfirmMatch =
  | "format"
  | "high"
  | "medium"
  | "low"
  | "none";

export type SheetConfirmRow = {
  key: string;
  rowIndex: number;
  descripcion: string;
  quantity: number;
  include: boolean;
  skipped: boolean;
  skipReason: string | null;
  productId: string | null;
  productName: string | null;
  presentation: string | null;
  packaging: string | null;
  stockQuantity: number | null;
  cost: number;
  quantityUnit: QuantityUnit;
  matchConfidence: SheetConfirmMatch;
  extra: boolean;
};

function isSkippedLine(line: ExtractedSheetLine): boolean {
  if (line.skipped) return true;
  const reason = (line.skipReason ?? "").trim().toLowerCase();
  if (/no\s*hay|termin|agotad|sin\s*stock/.test(reason)) return true;
  const qty = line.cantidad == null ? null : toStockNumber(line.cantidad);
  return qty == null || qty <= 0;
}

function catalogById(
  products: InvoiceMatchProduct[],
): Map<string, InvoiceMatchProduct> {
  return new Map(products.map((p) => [p.id, p]));
}

function toConfirmRow(opts: {
  key: string;
  rowIndex: number;
  descripcion: string;
  quantity: number;
  skipped: boolean;
  skipReason: string | null;
  product: InvoiceMatchProduct | FormatSheetLine | null;
  matchConfidence: SheetConfirmMatch;
  extra: boolean;
  stockQuantity?: number | null;
}): SheetConfirmRow {
  const packaging =
    opts.product && "packaging" in opts.product
      ? opts.product.packaging ?? null
      : null;
  const name =
    opts.product == null
      ? null
      : "name" in opts.product
        ? opts.product.name
        : null;
  const productId =
    opts.product == null
      ? null
      : "productId" in opts.product
        ? opts.product.productId
        : opts.product.id;
  const presentation =
    opts.product && "presentation" in opts.product
      ? opts.product.presentation ?? null
      : null;
  const cost =
    opts.product && "cost" in opts.product ? Number(opts.product.cost ?? 0) : 0;
  const stock =
    opts.stockQuantity ??
    (opts.product && "stockQuantity" in opts.product
      ? opts.product.stockQuantity
      : null);

  return {
    key: opts.key,
    rowIndex: opts.rowIndex,
    descripcion: opts.descripcion,
    quantity: opts.quantity > 0 ? opts.quantity : 0,
    include: !opts.skipped && opts.quantity > 0 && Boolean(productId),
    skipped: opts.skipped,
    skipReason: opts.skipReason,
    productId,
    productName: name,
    presentation,
    packaging,
    stockQuantity: stock ?? null,
    cost,
    quantityUnit: defaultQuantityUnit(packaging),
    matchConfidence: opts.matchConfidence,
    extra: opts.extra,
  };
}

/**
 * Une filas extraídas con el formato impreso (por número de fila)
 * y productos manuscritos extra (por similitud de catálogo).
 */
export function mapExtractedSheetToConfirmRows(input: {
  extractedLines: ExtractedSheetLine[];
  formatLines: FormatSheetLine[];
  catalog: InvoiceMatchProduct[];
}): SheetConfirmRow[] {
  const extracted = normalizeHandwrittenSheetLines(input.extractedLines);
  const byIndex = new Map<number, ExtractedSheetLine>();
  for (const line of extracted) {
    if (!byIndex.has(line.rowIndex)) byIndex.set(line.rowIndex, line);
  }
  const used = new Set<ExtractedSheetLine>();
  const catalogMap = catalogById(input.catalog);
  const rows: SheetConfirmRow[] = [];

  input.formatLines.forEach((fl, i) => {
    const rowIndex = i + 1;
    const ext = byIndex.get(rowIndex) ?? null;
    if (ext) used.add(ext);
    const skipped = ext ? isSkippedLine(ext) : true;
    const qty = ext && !skipped ? toStockNumber(ext.cantidad) : 0;
    const catalogHit = catalogMap.get(fl.productId) ?? null;
    rows.push(
      toConfirmRow({
        key: `fmt-${fl.productId}`,
        rowIndex,
        descripcion: ext?.descripcion?.trim() || fl.name,
        quantity: qty,
        skipped,
        skipReason: ext?.skipReason ?? (ext ? null : "Sin cantidad en la foto"),
        product: catalogHit
          ? {
              ...fl,
              cost: catalogHit.cost,
            }
          : fl,
        matchConfidence: "format",
        extra: false,
        stockQuantity: fl.stockQuantity,
      }),
    );
  });

  for (const ext of extracted) {
    if (used.has(ext)) continue;
    const matches = matchProductsBySimilarity(ext.descripcion, input.catalog, {
      limit: 1,
      minScore: 0.28,
    });
    const top = matches[0] ?? null;
    const skipped = isSkippedLine(ext);
    const qty = skipped ? 0 : toStockNumber(ext.cantidad);
    rows.push(
      toConfirmRow({
        key: `extra-${ext.rowIndex}`,
        rowIndex: ext.rowIndex,
        descripcion: ext.descripcion.trim(),
        quantity: qty,
        skipped,
        skipReason: ext.skipReason ?? null,
        product: top?.product ?? null,
        matchConfidence: top?.confidence ?? "none",
        extra: true,
        stockQuantity: null,
      }),
    );
  }

  return rows;
}
