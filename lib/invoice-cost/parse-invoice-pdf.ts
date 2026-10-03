import {
  parseInvoiceFromTextItems,
  type InvoiceLayoutParse,
  type PdfTextItem,
} from "@/lib/invoice-cost/parse-invoice-layout";
import { readPdfTextItems } from "@/lib/invoice-cost/read-pdf-text";

/** Por debajo de esto el PDF es un escaneo o una foto incrustada. */
const MIN_TEXT_CHARS = 80;

export async function tryParseInvoicePdf(
  bytes: Uint8Array,
): Promise<InvoiceLayoutParse> {
  let items: PdfTextItem[];
  try {
    items = await readPdfTextItems(bytes);
  } catch {
    return { ok: false, reason: "no se pudo leer el PDF" };
  }

  const chars = items.reduce(
    (count, item) => count + item.text.replace(/\s/g, "").length,
    0,
  );
  if (chars < MIN_TEXT_CHARS) {
    return {
      ok: false,
      reason: "PDF sin texto suficiente",
      text: chars > 0 ? formatPdfRows(items) : undefined,
    };
  }

  const parsed = parseInvoiceFromTextItems(items);
  if (parsed.ok) return parsed;
  return { ...parsed, text: formatPdfRows(items) };
}

/** Texto por filas para que Gemini lea la tabla sin recibir el PDF binario. */
export function formatPdfRows(items: PdfTextItem[]): string {
  const sorted = [...items].sort(
    (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
  );
  const lines: string[] = [];
  let bucket: PdfTextItem[] = [];
  let anchorY = Number.NaN;
  let anchorPage = -1;

  const flush = () => {
    if (bucket.length === 0) return;
    const text = [...bucket]
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text.trim())
      .filter((value) => value.length > 0)
      .join(" | ");
    if (text) lines.push(text);
    bucket = [];
  };

  for (const item of sorted) {
    const text = item.text.trim();
    if (!text) continue;
    if (
      bucket.length > 0 &&
      (item.page !== anchorPage || Math.abs(item.y - anchorY) > 2.5)
    ) {
      flush();
    }
    if (bucket.length === 0) {
      anchorY = item.y;
      anchorPage = item.page;
    }
    bucket.push(item);
  }
  flush();
  return lines.join("\n").slice(0, 60_000);
}
