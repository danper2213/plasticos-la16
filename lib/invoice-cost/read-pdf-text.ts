import { extractTextItems } from "unpdf";
import type { PdfTextItem } from "@/lib/invoice-cost/parse-invoice-layout";

/** Glifos con posición, una entrada por fragmento de texto del PDF. */
export async function readPdfTextItems(bytes: Uint8Array): Promise<PdfTextItem[]> {
  // unpdf transfiere el buffer y lo deja vacío. Hay que copiarlo:
  // si no, se pierde la foto incrustada en facturas que son solo imagen.
  const { items } = await extractTextItems(bytes.slice());
  const out: PdfTextItem[] = [];

  items.forEach((pageItems, index) => {
    for (const item of pageItems) {
      const text = item.str ?? "";
      if (!text.trim()) continue;
      out.push({
        text,
        x: item.x,
        y: item.y,
        width: item.width > 0 ? item.width : Math.max(4, text.length * 4),
        page: index + 1,
      });
    }
  });

  return out;
}
