import {
  extractedInvoiceSchema,
  type ExtractedInvoice,
} from "@/lib/invoice-cost/extract-invoice-shared";
import { COLOMBIA_IVA_FACTOR } from "@/lib/invoice-cost/resolve-invoice-iva";

export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  page: number;
};

export type InvoiceLayoutParse =
  | { ok: true; invoice: ExtractedInvoice }
  | { ok: false; reason: string; draft?: ExtractedInvoice; text?: string };

type ColKey =
  | "codigo"
  | "descripcion"
  | "um"
  | "cantidad"
  | "precioUnitario"
  | "valorIva"
  | "valorTotal";

type TextRow = {
  page: number;
  y: number;
  items: PdfTextItem[];
};

type ColumnBound = {
  key: ColKey;
  left: number;
  right: number;
};

const ROW_Y_TOLERANCE = 2.5;
const HEADER_MERGE_GAP = 16;
/** Si la suma de líneas se aleja más que esto del total, se descarta el parseo. */
const TOTAL_RELATIVE_TOLERANCE = 0.08;
const TOTAL_ABSOLUTE_TOLERANCE = 2000;

const SUPPLIER_SKIP =
  /factura|nit\b|dian|direcci[oó]n|tel[eé]fono|cliente|se[nñ]ores|fecha|n[uú]mero|resoluci|r[eé]gimen|actividad|p[aá]gina|cufe|responsable|correo|e-?mail|www\.|http/i;

/**
 * Montos de facturas colombianas: punto de miles y coma decimal.
 * Un punto seguido de exactamente 3 dígitos se lee como miles (`1.234` → 1234).
 */
/** Cada monto por separado. No junta "12" y "34.000" en 1234000. */
export function parseCoAmountTokens(raw: string): number[] {
  const compact = raw
    .replace(/(\d)\s*\.\s*(?=\d{3}(?:\D|$))/g, "$1.")
    .replace(/(\d)\s*,\s*(?=\d{3}(?:\D|$))/g, "$1,");
  const tokens =
    compact.match(
      /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+|\d+(?:,\d{1,2})?/g,
    ) ?? [];
  const values: number[] = [];
  for (const token of tokens) {
    const value = parseCoAmount(token);
    if (value != null) values.push(value);
  }
  return values;
}

function lastPositiveAmount(raw: string): number | null {
  const values = parseCoAmountTokens(raw).filter((value) => value > 0);
  return values.length > 0 ? values[values.length - 1]! : null;
}

function isNumericText(text: string): boolean {
  return (
    parseCoAmountTokens(text).length > 0 && !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(text)
  );
}

/** Si el total cayó en otra columna, lo recupera como precio × cantidad. */
function totalFromUnitPrice(
  row: TextRow,
  precio: number | null,
  cantidad: number | null,
): number | null {
  if (precio == null || cantidad == null || precio <= 0 || cantidad <= 0) {
    return null;
  }
  const expected = precio * cantidad;
  const amounts: number[] = [];
  for (const item of row.items) {
    for (const token of parseCoAmountTokens(item.text)) {
      if (token > 0) amounts.push(token);
    }
  }
  return (
    amounts.find(
      (amount) =>
        amountsLoose(amount, expected) ||
        amountsLoose(amount, expected * COLOMBIA_IVA_FACTOR),
    ) ?? null
  );
}

export function parseCoAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!trimmed || !/^[\d.,]+$/.test(trimmed)) return null;

  let normalized = trimmed;
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    if (/^\d{1,3}(,\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/,/g, "");
    } else {
      const parts = normalized.split(",");
      normalized =
        parts.length > 2 ? parts.join("") : `${parts[0]}.${parts[1]}`;
    }
  } else if (lastDot >= 0) {
    const parts = normalized.split(".");
    const fraction = parts[parts.length - 1] ?? "";
    const integer = parts[0] ?? "";
    if (
      parts.length > 2 ||
      (parts.length === 2 &&
        fraction.length === 3 &&
        integer !== "0" &&
        integer !== "")
    ) {
      normalized = parts.join("");
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseInvoiceFromTextItems(
  items: PdfTextItem[],
): InvoiceLayoutParse {
  const rows = clusterRows(items.filter((item) => item.text.trim().length > 0));
  if (rows.length === 0) {
    return { ok: false, reason: "PDF sin texto" };
  }

  const headerIndex = rows.findIndex((row) => isHeaderRow(row));
  if (headerIndex < 0) {
    return { ok: false, reason: "sin encabezado de tabla" };
  }

  const columns = buildColumns(rows[headerIndex]!);
  if (
    !columns.some((column) => column.key === "descripcion") ||
    !columns.some(
      (column) => column.key === "cantidad" || column.key === "valorTotal",
    )
  ) {
    return { ok: false, reason: "columnas insuficientes" };
  }

  const lines: ExtractedInvoice["lines"] = [];
  let invoiceTotalNeto: number | null = null;
  let invoiceTotalConIva: number | null = null;
  let invoiceTotalIva: number | null = null;
  let inFooter = false;

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (isHeaderRow(row)) continue;

    const footer = classifyFooter(row);
    if (footer) {
      inFooter = true;
      const amount = rightmostAmount(row);
      if (footer === "neto" && amount != null && amount > 0) {
        invoiceTotalNeto = amount;
      } else if (footer === "conIva" && amount != null && amount > 0) {
        invoiceTotalConIva = amount;
      } else if (footer === "iva" && amount != null && amount >= 0) {
        invoiceTotalIva = amount;
      }
      continue;
    }

    if (inFooter) break;

    const cells = assignCells(row, columns);
    const descripcion = collapseSpace(cells.descripcion);
    const qtyTokens = parseCoAmountTokens(cells.cantidad);
    const cantidad = qtyTokens[0] ?? null;
    const valorTotal =
      lastPositiveAmount(cells.valorTotal) ??
      totalFromUnitPrice(row, lastPositiveAmount(cells.precioUnitario), cantidad);
    const precioFromColumn = lastPositiveAmount(cells.precioUnitario);
    const precioFromQty =
      qtyTokens.filter((token) => token > 0).length >= 2
        ? qtyTokens.filter((token) => token > 0)[1]!
        : null;
    const precioUnitario = precioFromColumn ?? precioFromQty;
    const hasProductNumbers = cantidad != null || valorTotal != null;

    if (!hasProductNumbers && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(descripcion)) {
      const previous = lines[lines.length - 1];
      if (previous) {
        previous.descripcion = collapseSpace(
          `${previous.descripcion} ${descripcion}`,
        );
      }
      continue;
    }

    if (
      !descripcion ||
      !/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(descripcion) ||
      cantidad == null ||
      cantidad <= 0 ||
      valorTotal == null ||
      valorTotal <= 0
    ) {
      continue;
    }

    const valorIva = lastPositiveAmount(cells.valorIva);
    const codigo = cleanCode(cells.codigo);
    lines.push({
      descripcion,
      um: normalizeUm(cells.um),
      cantidad,
      valorTotalNeto: valorTotal,
      ...(precioUnitario != null && precioUnitario > 0
        ? { precioUnitario }
        : {}),
      ...(valorIva != null && valorIva > 0 ? { valorIva } : {}),
      ...(codigo ? { codigoProveedor: codigo } : {}),
    });
  }

  if (lines.length === 0) {
    return { ok: false, reason: "sin líneas de producto" };
  }

  const lineSum = lines.reduce((acc, line) => acc + line.valorTotalNeto, 0);
  const totalsMatch = lineSumMatchesHeader(lineSum, {
    neto: invoiceTotalNeto,
    conIva: invoiceTotalConIva,
    iva: invoiceTotalIva,
  });

  const preHeader = rows.slice(0, headerIndex);
  const fullText = rows.map((row) => rowText(row)).join("\n");
  const parsed = extractedInvoiceSchema.safeParse({
    supplierName: extractSupplierName(preHeader),
    invoiceNumber: extractInvoiceNumber(fullText),
    invoiceDate: extractInvoiceDate(fullText),
    invoiceTotalConIva,
    invoiceTotalNeto,
    invoiceTotalIva,
    lineTotalsIncludeIva: null,
    lines,
  });

  if (!parsed.success) {
    return { ok: false, reason: "extracción incompleta" };
  }

  if (!totalsMatch) {
    const totalLabel = [invoiceTotalConIva, invoiceTotalNeto]
      .filter((value): value is number => value != null && value > 0)
      .join(" / ");
    return {
      ok: false,
      reason: `la suma de líneas (${Math.round(lineSum)}) no cuadra con el total${totalLabel ? ` (${totalLabel})` : ""}`,
      draft: parsed.data,
    };
  }

  return { ok: true, invoice: parsed.data };
}

function lineSumMatchesHeader(
  sum: number,
  totals: { neto: number | null; conIva: number | null; iva: number | null },
): boolean {
  const targets: number[] = [];
  if (totals.conIva != null && totals.conIva > 0) targets.push(totals.conIva);
  if (totals.neto != null && totals.neto > 0) targets.push(totals.neto);
  if (totals.neto != null && totals.iva != null) {
    targets.push(totals.neto + totals.iva);
  }
  if (totals.conIva != null && totals.iva != null && totals.iva > 0) {
    targets.push(Math.max(0, totals.conIva - totals.iva));
  }
  if (targets.some((target) => amountsLoose(sum, target))) return true;

  const gross = totals.conIva;
  const net = totals.neto;
  if (
    gross != null &&
    gross > 0 &&
    (net == null || net <= 0) &&
    amountsLoose(sum * COLOMBIA_IVA_FACTOR, gross)
  ) {
    return true;
  }

  if (
    net != null &&
    net > 0 &&
    (gross == null || gross <= 0) &&
    amountsLoose(sum, net * COLOMBIA_IVA_FACTOR)
  ) {
    return true;
  }

  return targets.length === 0;
}

function amountsLoose(a: number, b: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= Math.max(TOTAL_ABSOLUTE_TOLERANCE, scale * TOTAL_RELATIVE_TOLERANCE);
}

function clusterRows(items: PdfTextItem[]): TextRow[] {
  const sorted = [...items].sort(
    (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
  );
  const rows: TextRow[] = [];

  for (const item of sorted) {
    const current = rows[rows.length - 1];
    if (
      current &&
      current.page === item.page &&
      Math.abs(current.y - item.y) <= ROW_Y_TOLERANCE
    ) {
      current.items.push(item);
      continue;
    }
    rows.push({ page: item.page, y: item.y, items: [item] });
  }

  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
  }
  return rows;
}

function isHeaderRow(row: TextRow): boolean {
  const keys = headerCells(row);
  return (
    keys.has("descripcion") &&
    (keys.has("cantidad") || keys.has("valorTotal"))
  );
}

function buildColumns(row: TextRow): ColumnBound[] {
  const cells = [...headerCells(row).entries()].sort(
    (a, b) => a[1].x - b[1].x,
  );
  return cells.map(([key, cell], index) => {
    const previous = cells[index - 1]?.[1];
    const next = cells[index + 1]?.[1];
    const center = cell.x + cell.width / 2;
    const previousCenter = previous ? previous.x + previous.width / 2 : null;
    const nextCenter = next ? next.x + next.width / 2 : null;
    return {
      key,
      left:
        previousCenter == null ? Number.NEGATIVE_INFINITY : (previousCenter + center) / 2,
      right: nextCenter == null ? Number.POSITIVE_INFINITY : (center + nextCenter) / 2,
    };
  });
}

function headerCells(
  row: TextRow,
): Map<ColKey, { x: number; width: number }> {
  const merged = mergeCloseItems(row.items, HEADER_MERGE_GAP);
  const found = new Map<ColKey, { x: number; width: number }>();
  for (const cell of merged) {
    const key = classifyHeader(cell.text);
    if (!key) continue;
    const previous = found.get(key);
    const preferRight =
      key === "valorTotal" ||
      key === "valorIva" ||
      key === "cantidad" ||
      key === "precioUnitario";
    if (!previous || (preferRight && cell.x > previous.x)) {
      found.set(key, { x: cell.x, width: cell.width });
    }
  }
  return found;
}

function classifyHeader(text: string): ColKey | null {
  const normalized = stripAccents(text).toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  if (!compact) return null;
  if (/codigo|sku/.test(compact) || /^(ref|item|referencia)$/.test(compact)) {
    return "codigo";
  }
  if (compact.includes("descrip")) return "descripcion";
  if (
    ["um", "und", "unidad", "unidades", "medida"].includes(compact) ||
    /unidad(es)?demedida/.test(compact)
  ) {
    return "um";
  }
  if (compact.includes("cant")) return "cantidad";
  if (
    /unitario|preciounit|vlrunit|vrunit/.test(compact) &&
    !compact.includes("total")
  ) {
    return "precioUnitario";
  }
  if (compact.includes("iva")) return "valorIva";
  if (
    /vrtotal|valortotal|vlrtotal|totallinea|^total$/.test(compact) ||
    /vr\s*total|valor\s*total/.test(normalized)
  ) {
    return "valorTotal";
  }
  return null;
}

function assignCells(
  row: TextRow,
  columns: ColumnBound[],
): Record<ColKey, string> {
  const cells: Record<ColKey, string> = {
    codigo: "",
    descripcion: "",
    um: "",
    cantidad: "",
    precioUnitario: "",
    valorIva: "",
    valorTotal: "",
  };
  for (const item of row.items) {
    const numeric = isNumericText(item.text);
    const anchor = numeric
      ? item.x + item.width - 0.01
      : item.x + Math.min(item.width, 8) / 2;
    const column = columns.find(
      (candidate) => anchor >= candidate.left && anchor < candidate.right,
    );
    if (!column) continue;
    cells[column.key] = collapseSpace(`${cells[column.key]} ${item.text}`);
  }
  return cells;
}

function classifyFooter(row: TextRow): "neto" | "conIva" | "iva" | "stop" | null {
  const label = stripAccents(labelText(row)).toLowerCase().replace(/\s+/g, " ").trim();
  if (!label) return null;
  if (
    /^(retencion|rete\s*fuente|rete\s*ica|reteica|forma de pago|observaci|son\b|cufe|resoluci)/.test(
      label,
    )
  ) {
    return "stop";
  }
  if (
    /^(sub\s*total|total\s+neto|valor\s+neto|base\s+gravable|base\s+imponible)\b/.test(
      label,
    )
  ) {
    return "neto";
  }
  if (
    /^(total\s+a\s+pagar|valor\s+a\s+pagar|total\s+factura|total\s+general|neto\s+a\s+pagar|valor\s+total|total)\b/.test(
      label,
    )
  ) {
    return "conIva";
  }
  if (/^(iva|impuesto|valor\s+iva)\b/.test(label)) return "iva";
  return null;
}

function labelText(row: TextRow): string {
  return row.items
    .filter((item) => parseCoAmount(item.text) == null || /[A-Za-z]/.test(item.text))
    .map((item) => item.text)
    .join(" ");
}

function rightmostAmount(row: TextRow): number | null {
  const sorted = [...row.items].sort((a, b) => b.x - a.x);
  for (const item of sorted) {
    const amount = parseCoAmount(item.text);
    if (amount != null) return amount;
  }
  return null;
}

function extractSupplierName(rows: TextRow[]): string | null {
  const blob = rows.map((row) => rowText(row)).join("\n");
  const labeled = blob.match(
    /raz[oó]n\s+social\s*[:\-]?\s*([^\n]{3,80})/i,
  );
  if (labeled?.[1]) return cleanName(labeled[1]);

  const emisor = blob.match(/emisor\s*[:\-]?\s*([^\n]{3,80})/i);
  if (emisor?.[1]) return cleanName(emisor[1]);

  for (const row of rows) {
    const text = rowText(row).trim();
    if (text.length < 4 || SUPPLIER_SKIP.test(text)) continue;
    if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(text)) return cleanName(text);
  }
  return null;
}

function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /factura(?:\s+electr[oó]nica)?(?:\s+de\s+venta)?\s*(?:no\.?|nro\.?|n[°ºo]\.?|#|:)\s*([A-Z0-9][A-Z0-9-]{1,24})/i,
    /(?:n[uú]mero|nro\.?|no\.?)\s*(?:de\s*)?(?:factura|documento)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{1,24})/i,
    /\b((?:FE|FV|FC|SETP|SETT)\s*-?\s*\d{2,12})\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.replace(/\s+/g, "");
    if (value) return value;
  }
  return null;
}

function extractInvoiceDate(text: string): string | null {
  const match = text.match(
    /fecha(?:\s+de)?(?:\s+emisi[oó]n|\s+factura|\s+generaci[oó]n|\s+expedici[oó]n)?\s*[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
  );
  if (!match?.[1]) return null;
  return normalizeDate(match[1]);
}

function normalizeDate(raw: string): string | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return validIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const local = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!local) return null;
  const year = expandYear(Number(local[3]));
  return validIso(year, Number(local[2]), Number(local[1]));
}

function expandYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function validIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2100) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}

function cleanName(value: string): string {
  const withoutNit = value.split(/\bNIT\b/i)[0] ?? value;
  return withoutNit.replace(/\s+/g, " ").replace(/[:\-]+$/, "").trim();
}

function cleanCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  return trimmed;
}

function normalizeUm(value: string): string {
  const um = value.replace(/\./g, "").replace(/\s+/g, "").toUpperCase();
  return um || "CJ";
}

function rowText(row: TextRow): string {
  return collapseSpace(row.items.map((item) => item.text).join(" "));
}

function collapseSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mergeCloseItems(
  items: PdfTextItem[],
  gap: number,
): Array<{ text: string; x: number; width: number }> {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const cells: Array<{ text: string; x: number; width: number }> = [];
  for (const item of sorted) {
    const text = item.text.trim();
    if (!text) continue;
    const last = cells[cells.length - 1];
    if (last && item.x <= last.x + last.width + gap) {
      const right = Math.max(last.x + last.width, item.x + item.width);
      last.text = collapseSpace(`${last.text} ${text}`);
      last.width = right - last.x;
      continue;
    }
    cells.push({ text, x: item.x, width: Math.max(item.width, 1) });
  }
  return cells;
}
