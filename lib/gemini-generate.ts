import "server-only";

import { GoogleGenAI } from "@google/genai";
import {
  geminiUserFacingMessage,
  isMissingGeminiModelError,
  isRetryableGeminiError,
} from "@/lib/gemini-errors";

const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta GEMINI_API_KEY en el entorno. Agregala en .env.local y en Vercel.",
    );
  }
  return key;
}

function uniqueModels(models: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function geminiModelChain(preferred: string): string[] {
  const extras =
    process.env.GEMINI_FALLBACK_MODELS?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? DEFAULT_FALLBACK_MODELS;
  return uniqueModels([preferred, ...extras]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Llama a Gemini con JSON schema. Si el modelo está saturado (503),
 * reintenta y cae a modelos de respaldo.
 */
export async function generateGeminiJsonText(input: {
  model: string;
  contents: unknown;
  config: unknown;
  emptyTextError: string;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const models = geminiModelChain(input.model);
  let lastError: unknown;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: input.contents as never,
        config: input.config as never,
      });
      const text = response.text?.trim();
      if (!text) {
        throw new Error(input.emptyTextError);
      }
      if (i > 0) {
        console.warn(`[gemini] extraje con modelo de respaldo ${model}`);
      }
      return text;
    } catch (error) {
      lastError = error;
      const hasNext = i < models.length - 1;
      const canSkip =
        isRetryableGeminiError(error) || isMissingGeminiModelError(error);

      if (!hasNext || !canSkip) {
        throw new Error(
          geminiUserFacingMessage(error, input.emptyTextError),
        );
      }

      console.warn(
        `[gemini] ${model} no respondió (${isMissingGeminiModelError(error) ? "no existe" : "saturado/cuota"}), pruebo ${models[i + 1]}`,
        error instanceof Error ? error.message.slice(0, 180) : error,
      );
      await sleep(400);
    }
  }

  throw new Error(geminiUserFacingMessage(lastError, input.emptyTextError));
}
