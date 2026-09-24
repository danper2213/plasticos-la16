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
    return { ok: false, reason: "PDF sin texto suficiente" };
  }

  const parsed = parseInvoiceFromTextItems(items);
  if (parsed.ok) return parsed;
  return { ...parsed, text: formatPdfRows(items) };
}

/** Texto por filas para que Gemini lea la tabla sin recibir el PDF binario. */
function formatPdfRows(items: PdfTextItem[]): string {
  const sorted = [...items].sort(
    (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
  );
  const lines: string[] = [];
  let current = "";
  let lastY = Number.NaN;
  let lastPage = -1;
  for (const item of sorted) {
    const text = item.text.trim();
    if (!text) continue;
    if (item.page !== lastPage || Math.abs(item.y - lastY) > 2.5) {
      if (current.trim()) lines.push(current.trim());
      current = text;
      lastY = item.y;
      lastPage = item.page;
    } else {
      current = `${current} | ${text}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join("\n").slice(0, 60_000);
}
