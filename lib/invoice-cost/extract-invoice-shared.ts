import { z } from "zod";
import type { RawInvoiceLine } from "@/lib/invoice-cost/process-invoice-line";

export const extractedLineSchema = z.object({
  descripcion: z.string().min(1),
  um: z.string().min(1).default("CJ"),
  cantidad: z.coerce.number().positive(),
  valorTotalNeto: z.coerce.number().nonnegative(),
  valorIva: z.coerce.number().nonnegative().optional(),
  codigoProveedor: z.string().optional().nullable(),
  /** Metros por rollo desde descripción (ej. 120ML → 120). */
  metrosPorUnidad: z.coerce.number().positive().optional().nullable(),
  /** Rollos completos cuando UM es KG. */
  numeroRollos: z.coerce.number().positive().optional().nullable(),
  /** Metros totales de la línea (rollos × metrosPorUnidad). */
  metrajeTotal: z.coerce.number().positive().optional().nullable(),
});

export const extractedInvoiceSchema = z.object({
  supplierName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  /** Fecha de la factura (YYYY-MM-DD) si aparece. */
  invoiceDate: z.string().optional().nullable(),
  /** Total general de la factura CON IVA (cabecera). */
  invoiceTotalConIva: z.coerce.number().positive().optional().nullable(),
  /** Total general NETO (sin IVA) si solo aparece ese. */
  invoiceTotalNeto: z.coerce.number().positive().optional().nullable(),
  lines: z.array(extractedLineSchema).min(1),
});

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;

export type InvoiceExtractMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

const ALLOWED_MIME: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const INVOICE_FILE_MAX_BYTES = 15 * 1024 * 1024;

export function isAllowedInvoiceMime(mime: string): mime is InvoiceExtractMime {
  return ALLOWED_MIME.has(mime);
}

export function assertInvoiceFileSize(byteLength: number): void {
  if (byteLength <= 0) throw new Error("El archivo está vacío.");
  if (byteLength > INVOICE_FILE_MAX_BYTES) {
    throw new Error("El archivo supera el máximo de 15 MB.");
  }
}

export function extractedToRawLines(extracted: ExtractedInvoice): RawInvoiceLine[] {
  return extracted.lines.map((line) => ({
    descripcion: line.descripcion.trim(),
    um: line.um.trim().toUpperCase() || "CJ",
    cantidad: line.cantidad,
    valorTotalNeto: line.valorTotalNeto,
    valorIva: line.valorIva,
    codigoProveedor: line.codigoProveedor ?? null,
    metrosPorUnidad: line.metrosPorUnidad ?? null,
    numeroRollos: line.numeroRollos ?? null,
    metrajeTotal: line.metrajeTotal ?? null,
  }));
}
