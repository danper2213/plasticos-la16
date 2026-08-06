import "server-only";

import { GoogleGenAI, Type } from "@google/genai";
import type { InvoiceCostLearning } from "@/lib/invoice-cost/learning";
import {
  assertInvoiceFileSize,
  extractedInvoiceSchema,
  type ExtractedInvoice,
  type InvoiceExtractMime,
} from "@/lib/invoice-cost/extract-invoice-shared";

export type { ExtractedInvoice, InvoiceExtractMime };
export {
  assertInvoiceFileSize,
  extractedToRawLines,
  isAllowedInvoiceMime,
} from "@/lib/invoice-cost/extract-invoice-shared";

/** Modelo por defecto para extracción de facturas. */
export const DEFAULT_GEMINI_INVOICE_MODEL = "gemini-3.6-flash";

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta GEMINI_API_KEY en el entorno. Agregala en .env.local y en Vercel.",
    );
  }
  return key;
}

function getGeminiInvoiceModel(): string {
  return process.env.GEMINI_INVOICE_MODEL?.trim() || DEFAULT_GEMINI_INVOICE_MODEL;
}

function buildExtractionPrompt(learnings: InvoiceCostLearning[]): string {
  const examples = learnings
    .slice(0, 12)
    .map((l) => `- ${l.sampleDescription}`)
    .join("\n");

  return [
    "Sos un extractor de facturas de compra de un distribuidor de plásticos en Colombia.",
    "Analizá el PDF o la foto de la factura y devolvé SOLO JSON válido según el schema.",
    "",
    "Reglas:",
    "- CABECERA (obligatorio cuando sea legible):",
    "  · supplierName: razón social / nombre del proveedor emisor.",
    "  · invoiceNumber: número de factura (ej. FE, FV, prefijo+número).",
    "  · invoiceDate: fecha de la factura en YYYY-MM-DD si aparece.",
    "  · invoiceTotalConIva: TOTAL A PAGAR / total con IVA de la factura (no de una línea).",
    "  · invoiceTotalNeto: subtotal/neto general si está visible (sin IVA).",
    "- Cada ítem de producto es una línea.",
    "- descripcion: texto completo de la columna DESCRIPCIÓN (incluí empaque y metraje si aparece).",
    "- um: unidad de medida de la línea (MTR, KG, RL, CJ, etc.).",
    "- cantidad: número de la columna CANTIDAD (puede ser metros o kilos).",
    "- valorTotalNeto: VALOR TOTAL de la línea SIN IVA.",
    "- valorIva: VALOR IVA de la línea si está visible.",
    "- codigoProveedor: código/SKU del proveedor si existe.",
    "",
    "METRAJE Calypso / film (obligatorio):",
    "- El costo del catálogo es por METRO.",
    "- En descripción, '120ML' = 120 metros de LARGO del rollo → metrosPorUnidad = 120.",
    "- '3M', '4M', '1.25M' son ANCHO, no metraje.",
    "- Si UM es MTR/MTS/MT: cantidad YA es metros totales. metrosPorUnidad=1, numeroRollos omitir, metrajeTotal=cantidad.",
    "- Si UM es KG: cantidad son kilos. Extraé metrosPorUnidad desde NNML,",
    "  numeroRollos = cuántos rollos completos representa ese peso,",
    "  metrajeTotal = numeroRollos × metrosPorUnidad.",
    "  Ej.: 121,10 kg ≈ 2 rollos de 100ML → numeroRollos=2, metrajeTotal=200.",
    "  Ej.: 53,84 kg ≈ 1 rollo de 120ML → numeroRollos=1, metrajeTotal=120.",
    "- NUNCA uses los kilos como metros ni multipliques kg × ML.",
    "",
    "- Ignorá retenciones, formas de pago y texto legal (salvo totales de cabecera arriba).",
    "- Si hay varias páginas, incluí todas las líneas de producto.",
    "",
    examples
      ? [
          "Descripciones ya confirmadas de este proveedor (usá el mismo estilo de texto cuando coincidan):",
          examples,
        ].join("\n")
      : "No hay ejemplos previos de este proveedor; extráé el texto tal como aparece en la factura.",
  ].join("\n");
}

/**
 * Extrae líneas de factura con Gemini a partir de PDF o imagen.
 * Usa aprendizajes previos del proveedor como ejemplos de estilo de descripción.
 */
export async function extractInvoiceLinesFromFile(input: {
  bytes: Uint8Array;
  mimeType: InvoiceExtractMime;
  learnings?: InvoiceCostLearning[];
}): Promise<ExtractedInvoice> {
  assertInvoiceFileSize(input.bytes.byteLength);

  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const base64 = Buffer.from(input.bytes).toString("base64");
  const prompt = buildExtractionPrompt(input.learnings ?? []);

  const response = await ai.models.generateContent({
    model: getGeminiInvoiceModel(),
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
          supplierName: { type: Type.STRING, nullable: true },
          invoiceNumber: { type: Type.STRING, nullable: true },
          invoiceDate: { type: Type.STRING, nullable: true },
          invoiceTotalConIva: { type: Type.NUMBER, nullable: true },
          invoiceTotalNeto: { type: Type.NUMBER, nullable: true },
          lines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                descripcion: { type: Type.STRING },
                um: { type: Type.STRING },
                cantidad: { type: Type.NUMBER },
                valorTotalNeto: { type: Type.NUMBER },
                valorIva: { type: Type.NUMBER, nullable: true },
                codigoProveedor: { type: Type.STRING, nullable: true },
                metrosPorUnidad: { type: Type.NUMBER, nullable: true },
                numeroRollos: { type: Type.NUMBER, nullable: true },
                metrajeTotal: { type: Type.NUMBER, nullable: true },
              },
              required: ["descripcion", "um", "cantidad", "valorTotalNeto"],
            },
          },
        },
        required: ["lines"],
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini no devolvió texto al extraer la factura.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new Error("La respuesta de extracción no es JSON válido.");
  }

  const parsed = extractedInvoiceSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(
      `Extracción incompleta: ${parsed.error.issues.map((i) => i.message).join(" · ")}`,
    );
  }

  return parsed.data;
}
