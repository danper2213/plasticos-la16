import { detectImageMimeFromBytes } from "@/lib/verify-upload-bytes";
import {
  isAllowedInvoiceMime,
  type InvoiceExtractMime,
} from "@/lib/invoice-cost/extract-invoice-shared";

async function detectPdfMime(file: File): Promise<"application/pdf" | null> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf =
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46; // F
  return isPdf ? "application/pdf" : null;
}

/** Valida magic bytes de PDF o imagen de factura. */
export async function detectInvoiceFileMime(
  file: File,
): Promise<
  { ok: true; mime: InvoiceExtractMime } | { ok: false; error: string }
> {
  if (!file || file.size <= 0) {
    return { ok: false, error: "Seleccioná un archivo válido." };
  }

  const pdf = await detectPdfMime(file);
  if (pdf) return { ok: true, mime: pdf };

  const image = await detectImageMimeFromBytes(file);
  if (image && isAllowedInvoiceMime(image)) {
    return { ok: true, mime: image };
  }

  return {
    ok: false,
    error: "Formato no soportado. Usá PDF, JPG, PNG o WEBP.",
  };
}
