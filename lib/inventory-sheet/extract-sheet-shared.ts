import { z } from "zod";

export const extractedSheetLineSchema = z.object({
  rowIndex: z.coerce.number().int().positive(),
  descripcion: z.string().min(1),
  cantidad: z.coerce.number().nullable().optional(),
  skipped: z.boolean().optional().default(false),
  skipReason: z.string().nullable().optional(),
});

function parseMovementType(value: unknown): "in" | "out" | null {
  if (value === "in" || value === "out") return value;
  const t = String(value ?? "").trim().toLowerCase();
  if (t === "in" || t === "entrada") return "in";
  if (t === "out" || t === "salida") return "out";
  return null;
}

export const extractedSheetSchema = z.object({
  formatCode: z.string().nullable().optional(),
  movementType: z.preprocess(parseMovementType, z.enum(["in", "out"]).nullable()).optional(),
  sheetDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(extractedSheetLineSchema).min(1),
});

export type ExtractedSheetLine = z.infer<typeof extractedSheetLineSchema>;
export type ExtractedSheet = z.infer<typeof extractedSheetSchema>;

export type InventorySheetExtractMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";
