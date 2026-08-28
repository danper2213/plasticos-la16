import "server-only";

import { GoogleGenAI, Type } from "@google/genai";
import {
  assertInvoiceFileSize,
  type InvoiceExtractMime,
} from "@/lib/invoice-cost/extract-invoice-shared";
import {
  extractedSheetSchema,
  type ExtractedSheet,
} from "@/lib/inventory-sheet/extract-sheet-shared";
import { normalizeHandwrittenSheetLines } from "@/lib/inventory-sheet/normalize-handwritten-lines";

const DEFAULT_MODEL = "gemini-3.6-flash";

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta GEMINI_API_KEY en el entorno. Agregala en .env.local y en Vercel.",
    );
  }
  return key;
}

function getGeminiModel(): string {
  return process.env.GEMINI_INVOICE_MODEL?.trim() || DEFAULT_MODEL;
}

export type SheetExtractFormatHint = {
  code: string;
  name: string;
  lines: Array<{ rowIndex: number; productLabel: string }>;
};

function buildExtractionPrompt(hint?: SheetExtractFormatHint | null): string {
  const formatBlock =
    hint && hint.lines.length > 0
      ? [
          `Si coincide con un formato impreso, es el ${hint.code} (${hint.name}).`,
          "Productos impresos en este orden (usá el mismo rowIndex):",
          ...hint.lines.map((l) => `${l.rowIndex}. ${l.productLabel}`),
          "",
        ].join("\n")
      : "Puede NO ser un formato FMT. Si ves FMT-XXXXXX, devolvelo en formatCode; si no hay, formatCode=null.";

  return [
    "Sos un extractor de movimientos de inventario manuscritos de un distribuidor de plásticos en Colombia.",
    "Devolvé SOLO JSON válido según el schema.",
    "",
    "Hay DOS tipos de documento. Detectá cuál es:",
    "A) Hoja FMT impresa: casillas Entrada/Salida, código FMT-XXXXXX, tabla # | Cantidad | Producto. Cantidad a mano, producto impreso.",
    "B) Lista libre a mano (cuaderno, papel de Cámara de Comercio, etc.): cada renglón es `cantidad - producto`, a veces con visto bueno. Puede decir ENTRADA o SALIDA en cualquier lado.",
    "",
    formatBlock,
    "Reglas comunes:",
    "- movementType: in si dice/marca Entrada, out si dice/marca Salida, null si no se ve. Palabras sueltas ENTRADA/SALIDA cuentan.",
    "- sheetDate: YYYY-MM-DD si hay fecha legible (DÍA/MES/AÑO). Si está vacío, null.",
    "- Cada renglón de producto es una línea. rowIndex empieza en 1 y es correlativo.",
    "- descripcion: SOLO el nombre del producto y su talle/color (Bandeja #7, Vaso 14 oz, Tapa 9, 10, 12). NO incluyas la cantidad.",
    "- Expandí comillas/ditto (\" \" '' ¨) con el TIPO de producto de la fila anterior: \" 13, 14, 16\" tras \"Tapa 9, 10, 12\" → \"Tapa 13, 14, 16\". \" 5 oz Transparente\" tras \"Vaso 5 oz Blanco\" → \"Vaso 5 oz Transparente\".",
    "- cantidad: el número de unidades/pacas del renglón (el de la izquierda del guión, o la columna Cantidad). No uses talles (#7, 14 oz) como cantidad.",
    "- Ignorá logos, membretes (Cámara de Comercio), vistos buenos/checkmarks, firmas y texto legal.",
    "- skipped=true si dice NO HAY, Termin, Terminado, agotado, o cantidad 0.",
    "- skipReason: el texto de estado si aplica.",
    "",
    "Lista libre (tipo B):",
    "- Patrón típico: `2 - Bandeja #7` → cantidad=2, descripcion=\"Bandeja #7\".",
    "- Una cantidad + varios talles en el mismo renglón es UN producto (\"Tapa 9, 10, 12\"), no tres líneas.",
    "- Conservá color (Blanco, Transparente) y extras (tapa bebedor / tapa bebida).",
    "- Vasos típicos: 2, 3.5, 5, 7, 9, 10, 12, 14, 16, 24 oz. Si un vaso parece 35 oz, preferí 3.5 oz.",
    "- Si hay productos extra al final de una hoja FMT, incluilos con rowIndex correlativo.",
  ].join("\n");
}

export async function extractInventorySheetFromFile(input: {
  bytes: Uint8Array;
  mimeType: InvoiceExtractMime;
  formatHint?: SheetExtractFormatHint | null;
}): Promise<ExtractedSheet> {
  assertInvoiceFileSize(input.bytes.byteLength);

  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const base64 = Buffer.from(input.bytes).toString("base64");
  const prompt = buildExtractionPrompt(input.formatHint ?? null);

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: input.mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          formatCode: { type: Type.STRING, nullable: true },
          movementType: { type: Type.STRING, nullable: true },
          sheetDate: { type: Type.STRING, nullable: true },
          notes: { type: Type.STRING, nullable: true },
          lines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                rowIndex: { type: Type.NUMBER },
                descripcion: { type: Type.STRING },
                cantidad: { type: Type.NUMBER, nullable: true },
                skipped: { type: Type.BOOLEAN },
                skipReason: { type: Type.STRING, nullable: true },
              },
              required: ["rowIndex", "descripcion"],
            },
          },
        },
        required: ["lines"],
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini no devolvió texto al leer la hoja.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new Error("Gemini devolvió un JSON inválido al leer la hoja.");
  }

  const parsed = extractedSheetSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("La lectura de la hoja no tiene el formato esperado.");
  }
  return {
    ...parsed.data,
    lines: normalizeHandwrittenSheetLines(parsed.data.lines),
  };
}
