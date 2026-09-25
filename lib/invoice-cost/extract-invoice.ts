import "server-only";

import { Type } from "@google/genai";
import { isInvalidArgumentGeminiError } from "@/lib/gemini-errors";
import { generateGeminiJsonText } from "@/lib/gemini-generate";
import type { InvoiceCostLearning } from "@/lib/invoice-cost/learning";
import {
  assertInvoiceFileSize,
  extractedInvoiceSchema,
  type ExtractedInvoice,
  type InvoiceExtractMime,
} from "@/lib/invoice-cost/extract-invoice-shared";
import { extractEmbeddedJpegImages } from "@/lib/invoice-cost/extract-pdf-images";
import { tryParseInvoicePdf } from "@/lib/invoice-cost/parse-invoice-pdf";

export type { ExtractedInvoice, InvoiceExtractMime };
export {
  assertInvoiceFileSize,
  extractedToRawLines,
  isAllowedInvoiceMime,
} from "@/lib/invoice-cost/extract-invoice-shared";

/** Modelo por defecto para extracción de facturas. */
export const DEFAULT_GEMINI_INVOICE_MODEL = "gemini-3.6-flash";

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(slice);
}

function isGeminiFileRejection(error: unknown): boolean {
  if (isInvalidArgumentGeminiError(error)) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("no aceptó ese archivo");
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
    "  · invoiceTotalIva: valor del IVA de cabecera si aparece (no el de una línea).",
    "  · lineTotalsIncludeIva: true si el VR TOTAL / VALOR TOTAL de cada línea YA incluye IVA",
    "    (etiquetas: IVA incluido, total con IVA, VR TOTAL = neto+IVA).",
    "    false si ese valor es neto/subtotal/antes de IVA y el impuesto va en columna o pie aparte.",
    "- Cada ítem de producto es una línea.",
    "- descripcion: texto completo de la columna DESCRIPCIÓN (incluí empaque y metraje si aparece).",
    "- um: unidad de medida de la línea (MTR, KG, RL, CJ, etc.).",
    "- cantidad: número de la columna CANTIDAD (puede ser metros o kilos).",
    "- valorTotalNeto: columna VR TOTAL / VALOR TOTAL de la línea TAL COMO APARECE.",
    "  No lo multipliques ni le restes IVA. El sistema decide si ya trae IVA.",
    "- valorIva: VALOR IVA de la línea si está en una columna aparte (no lo restes del VR TOTAL).",
    "- precioUnitario: columna VR UNITARIO / PRECIO UNITARIO / VALOR UNITARIO, sin IVA.",
    "  No lo calcules ni lo multipliques. Si no aparece, omitilo.",
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

export type InvoiceExtractionSource = "local" | "gemini";

export type InvoiceExtractionResult = {
  invoice: ExtractedInvoice;
  source: InvoiceExtractionSource;
};

/**
 * Extrae líneas de factura. Los PDF con texto se leen en el servidor;
 * fotos, escaneos y tablas no reconocidas siguen con Gemini.
 */
export async function extractInvoiceLinesFromFile(input: {
  bytes: Uint8Array;
  mimeType: InvoiceExtractMime;
  learnings?: InvoiceCostLearning[];
}): Promise<InvoiceExtractionResult> {
  assertInvoiceFileSize(input.bytes.byteLength);

  if (input.mimeType === "application/pdf") {
    const local = await tryParseInvoicePdf(input.bytes);
    if (local.ok) {
      console.info(
        `[invoice-pdf] lectura local (${local.invoice.lines.length} líneas)`,
      );
      return { invoice: local.invoice, source: "local" };
    }
    const plainText = local.text?.trim();
    const pagePhotos = plainText
      ? []
      : extractEmbeddedJpegImages(input.bytes)
          .filter((image) => image.bytes.byteLength >= 20_000)
          .slice(0, 4);

    if (pagePhotos.length > 0) {
      console.info(
        `[invoice-pdf] sin texto; envío ${pagePhotos.length} foto(s) de la factura a Gemini`,
      );
    } else {
      console.info(`[invoice-pdf] uso Gemini: ${local.reason}`);
    }

    try {
      return await extractInvoiceOrDraft(local.draft, {
        ...input,
        plainText,
        pagePhotos,
      });
    } catch (error) {
      if (!plainText && pagePhotos.length === 0 && isGeminiFileRejection(error)) {
        throw new Error(
          "Ese PDF no trae texto que se pueda leer. Subí una foto nítida de la factura.",
        );
      }
      if (pagePhotos.length > 0 && isGeminiFileRejection(error)) {
        throw new Error(
          "No se pudo leer la foto de esa factura. Subí una foto nítida, más de cerca.",
        );
      }
      throw error;
    }
  }

  const invoice = await extractInvoiceWithGemini(input);
  return { invoice, source: "gemini" };
}

type GeminiInvoiceInput = {
  bytes: Uint8Array;
  mimeType: InvoiceExtractMime;
  learnings?: InvoiceCostLearning[];
  /** Texto ya extraído del PDF. Evita enviar el binario, que Gemini a veces rechaza. */
  plainText?: string;
  /** Fotos de página cuando el PDF no tiene texto seleccionable. */
  pagePhotos?: { mimeType: "image/jpeg"; bytes: Uint8Array }[];
  /** Segundo intento si Gemini rechaza el schema junto con el archivo. */
  omitSchema?: boolean;
};

async function extractInvoiceOrDraft(
  draft: ExtractedInvoice | undefined,
  input: GeminiInvoiceInput,
): Promise<InvoiceExtractionResult> {
  try {
    const invoice = await extractInvoiceWithGemini(input);
    return { invoice, source: "gemini" };
  } catch (error) {
    if (isGeminiFileRejection(error) && !input.omitSchema) {
      console.warn("[invoice-pdf] Gemini rechazó el pedido; reintento sin schema");
      try {
        const invoice = await extractInvoiceWithGemini({
          ...input,
          omitSchema: true,
        });
        return { invoice, source: "gemini" };
      } catch (retryError) {
        console.warn("[invoice-pdf] reintento sin schema falló", retryError);
        if (draft) {
          return { invoice: draft, source: "local" };
        }
        throw retryError;
      }
    }
    if (draft) {
      console.warn("[invoice-pdf] Gemini falló; se usa la lectura local", error);
      return { invoice: draft, source: "local" };
    }
    throw error;
  }
}

async function extractInvoiceWithGemini(input: GeminiInvoiceInput): Promise<ExtractedInvoice> {
  const prompt = buildExtractionPrompt(input.learnings ?? []);
  const plainText = input.plainText?.trim();
  const pagePhotos = input.pagePhotos ?? [];
  const textPrompt = plainText
    ? `${prompt}\n\nEl PDF ya se convirtió a texto. Cada fila va en una línea y las columnas están separadas por " | ". Extraé la factura desde este texto:\n\n${plainText}`
    : pagePhotos.length > 0
      ? `${prompt}\n\nEl PDF no tiene texto seleccionable. La factura está en la foto adjunta.`
      : prompt;
  const imageParts =
    pagePhotos.length > 0
      ? pagePhotos.map((photo) => ({
          inlineData: {
            mimeType: photo.mimeType,
            data: Buffer.from(photo.bytes).toString("base64"),
          },
        }))
      : plainText
        ? []
        : [
            {
              inlineData: {
                mimeType: input.mimeType,
                data: Buffer.from(input.bytes).toString("base64"),
              },
            },
          ];

  const text = await generateGeminiJsonText({
    model: getGeminiInvoiceModel(),
    emptyTextError: "Gemini no devolvió texto al extraer la factura.",
    contents: [
      {
        role: "user",
        parts: [{ text: textPrompt }, ...imageParts],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      ...(input.omitSchema
        ? {}
        : {
            responseSchema: {
        type: Type.OBJECT,
        properties: {
          supplierName: { type: Type.STRING, nullable: true },
          invoiceNumber: { type: Type.STRING, nullable: true },
          invoiceDate: { type: Type.STRING, nullable: true },
          invoiceTotalConIva: { type: Type.NUMBER, nullable: true },
          invoiceTotalNeto: { type: Type.NUMBER, nullable: true },
          invoiceTotalIva: { type: Type.NUMBER, nullable: true },
          lineTotalsIncludeIva: { type: Type.BOOLEAN, nullable: true },
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
                precioUnitario: { type: Type.NUMBER, nullable: true },
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
          }),
    },
  });

  let parsedJson: unknown;
  try {
    parsedJson = parseModelJson(text);
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
