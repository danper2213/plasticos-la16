import { describe, expect, it } from "vitest";
import {
  geminiUserFacingMessage,
  isInvalidArgumentGeminiError,
  isMissingGeminiModelError,
  isQuotaGeminiError,
  isRetryableGeminiError,
  parseGeminiErrorPayload,
} from "@/lib/gemini-errors";

const overloaded = new Error(
  '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
);

const quota = new Error(
  '{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details.","status":"RESOURCE_EXHAUSTED"}}',
);

const retired = new Error(
  '{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash","status":"NOT_FOUND"}}',
);

describe("gemini errors", () => {
  it("parsea el JSON 503 del SDK", () => {
    expect(parseGeminiErrorPayload(overloaded)).toEqual({
      code: 503,
      message:
        "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
      status: "UNAVAILABLE",
    });
  });

  it("marca 503 high demand como reintentable", () => {
    expect(isRetryableGeminiError(overloaded)).toBe(true);
    expect(isMissingGeminiModelError(overloaded)).toBe(false);
  });

  it("marca 429 de cuota y 404 de modelo retirado", () => {
    expect(isQuotaGeminiError(quota)).toBe(true);
    expect(isRetryableGeminiError(quota)).toBe(true);
    expect(isMissingGeminiModelError(retired)).toBe(true);
    expect(isRetryableGeminiError(retired)).toBe(false);
  });

  it("devuelve mensajes en español, no el JSON crudo", () => {
    expect(geminiUserFacingMessage(overloaded, "fallback")).toBe(
      "Gemini está saturado (alta demanda). Reintentá en unos segundos.",
    );
    expect(geminiUserFacingMessage(quota, "fallback")).toBe(
      "Se agotó la cuota de Gemini. Reintentá en un minuto.",
    );
    expect(geminiUserFacingMessage(retired, "fallback")).toBe(
      "Gemini no pudo leer la factura con los modelos disponibles. Reintentá en unos segundos.",
    );
    expect(
      geminiUserFacingMessage(
        new Error(
          '{"error":{"code":400,"message":"Request contains an invalid argument.","status":"INVALID_ARGUMENT"}}',
        ),
        "fallback",
      ),
    ).toBe(
      "Gemini no aceptó ese archivo. Si el PDF es un escaneo, subí una foto nítida de la factura.",
    );
    expect(
      isInvalidArgumentGeminiError(
        new Error("Request contains an invalid argument."),
      ),
    ).toBe(true);
  });
});
