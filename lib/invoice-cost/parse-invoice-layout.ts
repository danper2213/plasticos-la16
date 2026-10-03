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

/** Columna que ocupa espacio (Mo, Impto %, Descuento) pero no es un dato de la línea. */
type BoundKey = ColKey | "ignore";

type AmountStyle = "co" | "us";

type HeaderCell = {
  key: BoundKey | null;
  x: number;
  width: number;
};

type TextRow = {
  page: number;
  y: number;
  items: PdfTextItem[];
};

type ColumnBound = {
  key: BoundKey;
  x: number;
  width: number;
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
 * Montos colombianos: punto de miles y coma decimal (`34.000` → 34000).
 * En facturas SIESA el estilo es al revés (`22,269.00`) y `30.000` es 30.
 */
/** Cada monto por separado. No junta "12" y "34.000" en 1234000. */
export function parseCoAmountTokens(
  raw: string,
  style: AmountStyle = "co",
): number[] {
  const compact = raw
    .replace(/(\d)\s*\.\s*(?=\d{3}(?:\D|$))/g, "$1.")
    .replace(/(\d)\s*,\s*(?=\d{3}(?:\D|$))/g, "$1,");
  const tokens =
    compact.match(
      /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:,\d{1,2})?/g,
    ) ?? [];
  const values: number[] = [];
  for (const token of tokens) {
    const value = parseCoAmount(token, style);
    if (value != null) values.push(value);
  }
  return values;
}

/** Coma de miles y punto decimal (`22,269.00`) contra punto de miles (`408.000,00`). */
function detectAmountStyle(items: PdfTextItem[]): AmountStyle {
  const blob = items.map((item) => item.text).join("\n");
  const us = blob.match(/\d{1,3}(?:,\d{3})+\.\d{1,2}/g)?.length ?? 0;
  const co = blob.match(/\d{1,3}(?:\.\d{3})+,\d{1,2}/g)?.length ?? 0;
  return us > co ? "us" : "co";
}

function lastPositiveAmount(raw: string, style: AmountStyle): number | null {
  const values = parseCoAmountTokens(raw, style).filter((value) => value > 0);
  return values.length > 0 ? values[values.length - 1]! : null;
}

function isNumericText(text: string, style: AmountStyle): boolean {
  return (
    parseCoAmountTokens(text, style).length > 0 &&
    !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(text)
  );
}

/** Si el total cayó en otra columna, lo recupera como precio × cantidad. */
function totalFromUnitPrice(
  row: TextRow,
  precio: number | null,
  cantidad: number | null,
  style: AmountStyle,
): number | null {
  if (precio == null || cantidad == null || precio <= 0 || cantidad <= 0) {
    return null;
  }
  const expected = precio * cantidad;
  const amounts: number[] = [];
  for (const item of row.items) {
    for (const token of parseCoAmountTokens(item.text, style)) {
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

export function parseCoAmount(
  raw: string,
  style: AmountStyle = "co",
): number | null {
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
    const dottedThousands =
      parts.length > 2 ||
      (parts.length === 2 &&
        fraction.length === 3 &&
        integer !== "0" &&
        integer !== "");
    // SIESA: `30.000` en cantidad son 30.000, no treinta mil.
    const usDecimal = style === "us" && parts.length === 2;
    if (dottedThousands && !usDecimal) {
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

  const style = detectAmountStyle(items);
  const lines: ExtractedInvoice["lines"] = [];
  let invoiceTotalNeto: number | null = null;
  let invoiceTotalConIva: number | null = null;
  let invoiceTotalIva: number | null = null;
  let inFooter = false;

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (isSiesaTotalsBanner(row)) {
      const values = rows[index + 1];
      if (values && !isSiesaTotalsBanner(values)) {
        const totals = readAlignedTotals(row, values, style);
        if (totals.neto != null) invoiceTotalNeto = totals.neto;
        if (totals.iva != null) invoiceTotalIva = totals.iva;
        if (totals.conIva != null) invoiceTotalConIva = totals.conIva;
        index += 1;
      }
      inFooter = true;
      continue;
    }

    if (isHeaderRow(row)) continue;

    const side = readSideLabeledTotals(row, style, rows[index + 1]);
    if (side.found) {
      inFooter = true;
      if (side.neto != null && invoiceTotalNeto == null) invoiceTotalNeto = side.neto;
      if (side.iva != null && invoiceTotalIva == null) invoiceTotalIva = side.iva;
      if (side.conIva != null && invoiceTotalConIva == null) {
        invoiceTotalConIva = side.conIva;
      }
      continue;
    }

    const footer = classifyFooter(row);
    if (footer) {
      inFooter = true;
      const amount = rightmostAmount(row, style);
      if (footer === "neto" && amount != null && amount > 0 && invoiceTotalNeto == null) {
        invoiceTotalNeto = amount;
      } else if (
        footer === "conIva" &&
        amount != null &&
        amount > 0 &&
        invoiceTotalConIva == null
      ) {
        invoiceTotalConIva = amount;
      } else if (
        footer === "iva" &&
        amount != null &&
        amount > 0 &&
        invoiceTotalIva == null
      ) {
        invoiceTotalIva = amount;
      }
      continue;
    }

    if (isSkippableRow(row) || isFooterNoise(row)) {
      if (isFooterNoise(row)) inFooter = true;
      continue;
    }

    if (inFooter) continue;

    const cells = assignCells(row, columns, style);
    const descripcion = cleanCellText(cells.descripcion);
    const qtyTokens = parseCoAmountTokens(cells.cantidad, style);
    const valorTotalRaw = lastPositiveAmount(cells.valorTotal, style);
    const precioFromColumn = lastPositiveAmount(cells.precioUnitario, style);
    const precioFromQty =
      qtyTokens.filter((token) => token > 0).length >= 2
        ? qtyTokens.filter((token) => token > 0)[1]!
        : null;
    const precioUnitario = precioFromColumn ?? precioFromQty;
    const cantidad = pickQuantity(
      cells.cantidad,
      precioUnitario,
      valorTotalRaw,
      style,
    );
    const valorTotal =
      valorTotalRaw ??
      totalFromUnitPrice(row, precioUnitario, cantidad, style);
    const hasProductNumbers = cantidad != null || valorTotal != null;

    if (!hasProductNumbers && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(descripcion)) {
      if (isFooterNoiseText(descripcion)) {
        inFooter = true;
        continue;
      }
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

    const valorIva = lastPositiveAmount(cells.valorIva, style);
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

function pickQuantity(
  raw: string,
  precio: number | null,
  total: number | null,
  style: AmountStyle,
): number | null {
  const primary =
    parseCoAmountTokens(raw, style).find((value) => value > 0) ?? null;
  if (primary == null || precio == null || total == null || precio <= 0 || total <= 0) {
    return primary;
  }
  if (priceTimesQtyMatches(precio, primary, total)) return primary;
  const alternateStyle: AmountStyle = style === "us" ? "co" : "us";
  const alternate =
    parseCoAmountTokens(raw, alternateStyle).find((value) => value > 0) ?? null;
  if (alternate != null && priceTimesQtyMatches(precio, alternate, total)) {
    return alternate;
  }
  return primary;
}

function priceTimesQtyMatches(
  precio: number,
  cantidad: number,
  total: number,
): boolean {
  return (
    amountsLoose(precio * cantidad, total) ||
    amountsLoose(precio * cantidad * COLOMBIA_IVA_FACTOR, total)
  );
}

function isHeaderRow(row: TextRow): boolean {
  const keys = new Set(headerCells(row).map((cell) => cell.key));
  return (
    keys.has("descripcion") &&
    (keys.has("cantidad") || keys.has("valorTotal"))
  );
}

function buildColumns(row: TextRow): ColumnBound[] {
  const cells = headerCells(row).sort((a, b) => a.x - b.x);
  return cells.map((cell, index) => {
    const previous = cells[index - 1];
    const next = cells[index + 1];
    const center = cell.x + cell.width / 2;
    const previousCenter = previous ? previous.x + previous.width / 2 : null;
    const nextCenter = next ? next.x + next.width / 2 : null;
    return {
      key: cell.key,
      x: cell.x,
      width: cell.width,
      left:
        previousCenter == null ? Number.NEGATIVE_INFINITY : (previousCenter + center) / 2,
      right: nextCenter == null ? Number.POSITIVE_INFINITY : (center + nextCenter) / 2,
    };
  });
}

const HEADER_RULES: Array<{ key: BoundKey; re: RegExp }> = [
  { key: "precioUnitario", re: /preciounit|vlrunit|vrunit|unitario/g },
  {
    key: "valorTotal",
    re: /valortotal|vrtotal|vlrtotal|totallinea|(?<![a-z])total(?![a-z])/g,
  },
  { key: "descripcion", re: /descripcion/g },
  { key: "cantidad", re: /cantidad/g },
  { key: "codigo", re: /referencia|codigo|sku|(?<![a-z])(?:ref|item)(?![a-z])/g },
  {
    key: "ignore",
    re: /impto|impuestos?|descuento|dscto|(?<![a-z])(?:reg|mo)(?![a-z])/g,
  },
  {
    key: "um",
    re: /um(?=precio)|(?<![a-z])(?:um|und|unidad|unidades|medida)(?![a-z])|unidaddemedida/g,
  },
  { key: "valorIva", re: /(?<![a-z])iva(?![a-z])|(?<=valor)iva(?![a-z])/g },
];

function headerCells(row: TextRow): Array<{ key: BoundKey; x: number; width: number }> {
  const fragments: HeaderCell[] = [];
  for (const item of [...row.items].sort((a, b) => a.x - b.x)) {
    const text = item.text.trim();
    if (!text || isBoxOnly(text)) continue;
    const labels = findHeaderLabels(text);
    if (labels.length === 0) {
      fragments.push({ key: null, x: item.x, width: Math.max(item.width, 1) });
      continue;
    }
    if (labels.length === 1) {
      fragments.push({
        key: labels[0]!.key,
        x: item.x,
        width: Math.max(item.width, 1),
      });
      continue;
    }
    const charWidth = item.width / Math.max(text.length, 1);
    for (const label of labels) {
      fragments.push({
        key: label.key,
        x: item.x + label.start * charWidth,
        width: Math.max((label.end - label.start) * charWidth, 1),
      });
    }
  }

  const merged = mergeHeaderFragments(fragments);
  const found = new Map<ColKey, { x: number; width: number }>();
  const ignores: Array<{ key: BoundKey; x: number; width: number }> = [];
  for (const cell of merged) {
    if (cell.key == null || cell.key === "ignore") {
      if (cell.key === "ignore") ignores.push({ key: "ignore", x: cell.x, width: cell.width });
      continue;
    }
    const previous = found.get(cell.key);
    const preferRight =
      cell.key === "valorTotal" ||
      cell.key === "valorIva" ||
      cell.key === "cantidad" ||
      cell.key === "precioUnitario";
    if (!previous || (preferRight && cell.x > previous.x)) {
      found.set(cell.key, { x: cell.x, width: cell.width });
    }
  }
  return [
    ...[...found.entries()].map(([key, cell]) => ({
      key,
      x: cell.x,
      width: cell.width,
    })),
    ...ignores,
  ];
}

function findHeaderLabels(
  text: string,
): Array<{ key: BoundKey; start: number; end: number }> {
  const { compact, map } = compactWithMap(text);
  if (!compact) return [];
  const candidates: Array<{ key: BoundKey; start: number; end: number }> = [];
  for (const rule of HEADER_RULES) {
    rule.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.re.exec(compact)) != null) {
      const compactStart = match.index;
      const compactEnd = match.index + match[0].length;
      const start = map[compactStart];
      const end = map[compactEnd - 1];
      if (start == null || end == null) continue;
      candidates.push({ key: rule.key, start, end: end + 1 });
    }
  }
  candidates.sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const chosen: Array<{ key: BoundKey; start: number; end: number }> = [];
  for (const candidate of candidates) {
    const overlaps = chosen.some(
      (other) => candidate.start < other.end && other.start < candidate.end,
    );
    if (!overlaps) chosen.push(candidate);
  }
  chosen.sort((a, b) => a.start - b.start);
  return chosen;
}

function compactWithMap(text: string): { compact: string; map: number[] } {
  const stripped = stripAccents(text).toLowerCase();
  let compact = "";
  const map: number[] = [];
  for (let index = 0; index < stripped.length; index += 1) {
    const ch = stripped[index]!;
    if (/[a-z0-9]/.test(ch)) {
      compact += ch;
      map.push(index);
    }
  }
  return { compact, map };
}

function mergeHeaderFragments(fragments: HeaderCell[]): HeaderCell[] {
  const cells: HeaderCell[] = [];
  for (const fragment of fragments) {
    const last = cells[cells.length - 1];
    const close =
      last != null && fragment.x <= last.x + last.width + HEADER_MERGE_GAP;
    if (close && last != null && last.key == null && fragment.key != null) {
      cells[cells.length - 1] = {
        key: fragment.key,
        x: last.x,
        width: fragment.x + fragment.width - last.x,
      };
      continue;
    }
    if (close && last != null && last.key != null && fragment.key == null) {
      last.width = Math.max(last.x + last.width, fragment.x + fragment.width) - last.x;
      continue;
    }
    cells.push({ ...fragment });
  }
  return cells;
}

function assignCells(
  row: TextRow,
  columns: ColumnBound[],
  style: AmountStyle,
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
    if (isBoxOnly(item.text)) continue;
    const column = columnForItem(item, columns, style);
    if (!column || column.key === "ignore") continue;
    cells[column.key] = collapseSpace(`${cells[column.key]} ${item.text}`);
  }
  return cells;
}

function columnForItem(
  item: PdfTextItem,
  columns: ColumnBound[],
  style: AmountStyle,
): ColumnBound | undefined {
  const contained = columns.find((column) => itemInsideHeader(item, column));
  if (contained) return contained;
  const numeric = isNumericText(item.text, style);
  const anchor = numeric
    ? item.x + item.width - 0.01
    : item.x + Math.min(item.width, 8) / 2;
  return columns.find(
    (candidate) => anchor >= candidate.left && anchor < candidate.right,
  );
}

function itemInsideHeader(item: PdfTextItem, column: ColumnBound): boolean {
  const left = item.x;
  const right = item.x + item.width;
  return left >= column.x - 1 && right <= column.x + column.width + 1;
}

function classifyFooter(
  row: TextRow,
): "neto" | "conIva" | "iva" | "stop" | null {
  const label = stripAccents(stripBoxDrawing(labelText(row)))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return null;
  if (
    /^total\s+(?:de\s+)?(?:nro|numero)\s+(?:de\s+)?lineas|^total\s+de\s+registros|^total\s+cantidades|valor\s+letras|detalle\s+de\s+impuestos/.test(
      label,
    )
  ) {
    return "stop";
  }
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

/**
 * Totales del pie que comparten fila con texto legal (Lastra: "Valor Bruto:" a la derecha).
 * No pisa un total ya leído del banner SIESA: el llamador solo guarda si sigue en null.
 */
function readSideLabeledTotals(
  row: TextRow,
  style: AmountStyle,
  nextRow?: TextRow,
): { found: boolean; neto: number | null; iva: number | null; conIva: number | null } {
  const items = [...row.items].sort((a, b) => a.x - b.x);
  const result: {
    found: boolean;
    neto: number | null;
    iva: number | null;
    conIva: number | null;
  } = { found: false, neto: null, iva: null, conIva: null };
  const nextIsClose =
    nextRow != null &&
    nextRow.page === row.page &&
    Math.abs(row.y - nextRow.y) <= 8;

  for (let index = 0; index < items.length; index += 1) {
    const phrase = phraseFrom(items, index);
    if (!phrase) continue;
    const role = sideTotalRole(phrase.text);
    if (!role) continue;
    const amount =
      amountToTheRight(items, phrase.endX, style) ??
      (nextIsClose && nextRow
        ? amountToTheRight(nextRow.items, phrase.endX, style)
        : null);
    if (amount == null || amount <= 0) continue;
    result.found = true;
    if (result[role] == null) result[role] = amount;
  }

  return result;
}

function phraseFrom(
  items: PdfTextItem[],
  start: number,
): { text: string; endX: number } | null {
  const first = items[start];
  if (!first || isBoxOnly(first.text) || isBareAmount(first.text)) return null;
  const parts = [first.text];
  let endX = first.x + first.width;
  for (let index = start + 1; index < items.length; index += 1) {
    const next = items[index]!;
    if (isBoxOnly(next.text) || isBareAmount(next.text)) break;
    if (next.x > endX + 18) break;
    parts.push(next.text);
    endX = Math.max(endX, next.x + next.width);
    if (parts.join(" ").length > 32) break;
  }
  return { text: parts.join(" "), endX };
}

function sideTotalRole(text: string): "neto" | "iva" | "conIva" | null {
  const compact = stripAccents(stripBoxDrawing(text))
    .toLowerCase()
    .replace(/[:.\s]+/g, " ")
    .trim();
  if (!compact || compact.length > 32) return null;
  if (
    /retencion|rete\b|descuento|dscto|nro|numero|linea|registro|cantidad/.test(
      compact,
    )
  ) {
    return null;
  }
  if (/^(valor bruto|sub ?total|total neto|base gravable|base imponible)$/.test(compact)) {
    return "neto";
  }
  if (/^(iva|valor iva|impuesto|impuestos)$/.test(compact)) return "iva";
  if (
    /^(total|total a pagar|valor a pagar|total factura|total general|neto a pagar|valor total)$/.test(
      compact,
    )
  ) {
    return "conIva";
  }
  return null;
}

function amountToTheRight(
  items: PdfTextItem[],
  endX: number,
  style: AmountStyle,
): number | null {
  let best: { x: number; amount: number } | null = null;
  for (const item of items) {
    if (item.x + 1 < endX) continue;
    const amount = parseCoAmount(stripBoxDrawing(item.text), style);
    if (amount == null || amount <= 0) continue;
    if (best == null || item.x < best.x) best = { x: item.x, amount };
  }
  return best?.amount ?? null;
}

function isBareAmount(text: string): boolean {
  return (
    parseCoAmount(stripBoxDrawing(text)) != null &&
    !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(text)
  );
}

function isSiesaTotalsBanner(row: TextRow): boolean {
  const text = stripAccents(rowText(row)).toLowerCase();
  return /total[_\s-]*bruto/.test(text) && /impuesto|sub[-\s]*total/.test(text);
}

function readAlignedTotals(
  banner: TextRow,
  values: TextRow,
  style: AmountStyle,
): { neto: number | null; iva: number | null; conIva: number | null } {
  const labels = collapseSingleLetters(banner)
    .map((cell) => ({
      role: totalsRole(cell.text),
      center: cell.x + cell.width / 2,
    }))
    .filter(
      (cell): cell is { role: "neto" | "iva" | "conIva"; center: number } =>
        cell.role != null,
    );
  const result: { neto: number | null; iva: number | null; conIva: number | null } = {
    neto: null,
    iva: null,
    conIva: null,
  };
  for (const item of values.items) {
    const amount = parseCoAmount(stripBoxDrawing(item.text), style);
    if (amount == null || amount <= 0) continue;
    const center = item.x + item.width / 2;
    let best: (typeof labels)[number] | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const label of labels) {
      const dist = Math.abs(center - label.center);
      if (dist < bestDist) {
        bestDist = dist;
        best = label;
      }
    }
    if (!best || bestDist > 90) continue;
    result[best.role] = amount;
  }
  return result;
}

function totalsRole(text: string): "neto" | "iva" | "conIva" | null {
  const compact = stripAccents(text).toLowerCase().replace(/[^a-z]/g, "");
  if (!compact || compact.includes("retencion") || compact.includes("dscto") || compact.includes("descuento")) {
    return null;
  }
  if (compact.includes("impuesto")) return "iva";
  if (compact.includes("totalbruto") || compact.includes("subtotal")) return "neto";
  if (compact === "total" || compact === "totalapagar") return "conIva";
  return null;
}

function collapseSingleLetters(
  row: TextRow,
): Array<{ text: string; x: number; width: number }> {
  const cells: Array<{ text: string; x: number; width: number }> = [];
  for (const item of [...row.items].sort((a, b) => a.x - b.x)) {
    const text = item.text.trim();
    if (!text || isBoxOnly(text)) continue;
    const last = cells[cells.length - 1];
    const single = /^[A-Za-zÁÉÍÓÚÑáéíóúñ]$/.test(text);
    if (
      last &&
      single &&
      /^[A-Za-zÁÉÍÓÚÑáéíóúñ]+$/.test(last.text) &&
      last.text.length <= 8 &&
      item.x <= last.x + last.width + 8
    ) {
      const right = Math.max(last.x + last.width, item.x + item.width);
      last.text += text;
      last.width = right - last.x;
      continue;
    }
    cells.push({ text, x: item.x, width: Math.max(item.width, 1) });
  }
  return cells;
}

function isFooterNoise(row: TextRow): boolean {
  return isFooterNoiseText(rowText(row));
}

function isFooterNoiseText(text: string): boolean {
  const normalized = stripAccents(stripBoxDrawing(text)).toLowerCase();
  return /total[_\s-]*bruto|total\s+(?:de\s+)?(?:nro|numero)\s+(?:de\s+)?lineas|total\s+de\s+registros|total\s+cantidades|valor\s+letras|detalle\s+de\s+impuestos|observaci|gran\s+contribuyente|autorizacion\s+numeracion|software\s+siesa|dscto/.test(
    normalized,
  );
}

function isSkippableRow(row: TextRow): boolean {
  const text = stripBoxDrawing(rowText(row)).replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g, "");
  return text.length === 0;
}

function isBoxOnly(text: string): boolean {
  return /^[|+\-\s]+$/.test(text.trim());
}

function labelText(row: TextRow): string {
  return row.items
    .filter((item) => parseCoAmount(item.text) == null || /[A-Za-z]/.test(item.text))
    .map((item) => item.text)
    .join(" ");
}

function rightmostAmount(row: TextRow, style: AmountStyle): number | null {
  const sorted = [...row.items].sort((a, b) => b.x - a.x);
  for (const item of sorted) {
    const amount = parseCoAmount(stripBoxDrawing(item.text), style);
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
    if (text.length < 4 || /^venta$/i.test(text)) continue;
    if (SUPPLIER_SKIP.test(text)) {
      const sibling = companySibling(row);
      if (sibling) return sibling;
      continue;
    }
    if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(text)) return cleanName(text);
  }
  return null;
}

/** Nombre al lado de un título "FACTURA …", no la palabra VENTA del mismo rótulo. */
function companySibling(row: TextRow): string | null {
  const names = [...row.items]
    .sort((a, b) => a.x - b.x)
    .map((item) => cleanName(item.text))
    .filter((text) => {
      if (text.length < 4 || SUPPLIER_SKIP.test(text) || /^venta$/i.test(text)) {
        return false;
      }
      return /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(text);
    });
  return (
    names.find((text) => /\b(s\.?\s*a\.?\s*s\.?|ltda|s\.?\s*a\.?)\b/i.test(text)) ??
    null
  );
}

function extractInvoiceNumber(text: string): string | null {
  const direct = text.match(/\bn[uú]mero\s*:\s*([A-Z][A-Z0-9-]{2,24})/i);
  if (direct?.[1]) return direct[1].replace(/\s+/g, "");

  const patterns = [
    /factura(?:\s+electr[oó]nica)?(?:\s+de\s+venta)?\s*(?:no\.?|nro\.?|n[°ºo]\.?|#|:)\s*([A-Z0-9][A-Z0-9-]{1,24})/gi,
    /(?:n[uú]mero|nro\.?|no\.?)\s*(?:de\s*)?(?:factura|documento)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{1,24})/gi,
    /\b((?:FE|FV|FC|SETP|SETT)\s*-?\s*\d{2,12})\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1]?.replace(/\s+/g, "");
      if (!value) continue;
      const at = match.index ?? 0;
      const before = text.slice(Math.max(0, at - 24), at);
      if (/remisi[oó]n/i.test(before)) continue;
      return value;
    }
  }
  return null;
}

function extractInvoiceDate(text: string): string | null {
  const match = text.match(
    /fecha(?:\s+de)?(?:\s+emisi[oó]n|\s+factura|\s+generaci[oó]n|\s+expedici[oó]n)?\s*[:\s]*(\d{4}-[A-Za-z]{3}-\d{1,2}|\d{4}-\d{2}-\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
  );
  if (!match?.[1]) return null;
  return normalizeDate(match[1]);
}

const MONTHS: Record<string, number> = {
  JAN: 1,
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
  DEC: 12,
};

function normalizeDate(raw: string): string | null {
  const named = raw.match(/^(\d{4})-([A-Za-z]{3})-(\d{1,2})$/);
  if (named) {
    const month = MONTHS[named[2]!.toUpperCase()];
    if (month == null) return null;
    return validIso(Number(named[1]), month, Number(named[3]));
  }
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
  const withoutBox = stripBoxDrawing(value);
  const withoutNit = withoutBox.split(/\bNIT\b/i)[0] ?? withoutBox;
  return withoutNit.replace(/\s+/g, " ").replace(/[:\-]+$/, "").trim();
}

function cleanCode(value: string): string | null {
  const trimmed = stripBoxDrawing(value).replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  const tokens = trimmed.split(" ").filter(Boolean);
  const refs = tokens.filter(
    (token) => /^[A-Z0-9][A-Z0-9-]{2,}$/i.test(token) && !/^\d{1,3}$/.test(token),
  );
  if (refs.length === 1) return refs[0]!;
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

function cleanCellText(value: string): string {
  return collapseSpace(stripBoxDrawing(value));
}

function stripBoxDrawing(value: string): string {
  return value
    .replace(/\+[+\-]*\+/g, " ")
    .replace(/\|/g, " ")
    .replace(/-{3,}/g, " ");
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
