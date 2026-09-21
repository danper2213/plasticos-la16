export type GeminiErrorPayload = {
  code?: number;
  status?: string;
  message?: string;
};

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

/** Extrae `{ error: { code, status, message } }` si el SDK lo metió en el mensaje. */
export function parseGeminiErrorPayload(
  error: unknown,
): GeminiErrorPayload | null {
  const raw = errorText(error);
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(jsonStart)) as {
      error?: GeminiErrorPayload;
    };
    if (!parsed || typeof parsed !== "object") return null;
    return parsed.error ?? (parsed as GeminiErrorPayload);
  } catch {
    return null;
  }
}

function normalizedStatus(error: unknown): string {
  const payload = parseGeminiErrorPayload(error);
  return (payload?.status ?? "").toUpperCase();
}

function numericCode(error: unknown): number | null {
  const payload = parseGeminiErrorPayload(error);
  return typeof payload?.code === "number" ? payload.code : null;
}

export function isQuotaGeminiError(error: unknown): boolean {
  const code = numericCode(error);
  const status = normalizedStatus(error);
  if (code === 429 || status === "RESOURCE_EXHAUSTED") return true;
  return /exceeded your current quota|resource.?exhausted/i.test(errorText(error));
}

export function isRetryableGeminiError(error: unknown): boolean {
  if (isQuotaGeminiError(error)) return true;
  const code = numericCode(error);
  const status = normalizedStatus(error);
  if (code === 503 || code === 500) return true;
  if (
    status === "UNAVAILABLE" ||
    status === "INTERNAL" ||
    status === "ABORTED"
  ) {
    return true;
  }
  const text = errorText(error);
  return /high demand|try again later|unavailable|overloaded/i.test(text);
}

export function isMissingGeminiModelError(error: unknown): boolean {
  const code = numericCode(error);
  const status = normalizedStatus(error);
  if (code === 404 || status === "NOT_FOUND") return true;
  return /no longer available to new users|model .+ is not found|is not found for API version/i.test(
    errorText(error),
  );
}

export function geminiUserFacingMessage(
  error: unknown,
  fallback: string,
): string {
  if (isQuotaGeminiError(error)) {
    return "Se agotó la cuota de Gemini. Reintentá en un minuto.";
  }
  if (isRetryableGeminiError(error)) {
    return "Gemini está saturado (alta demanda). Reintentá en unos segundos.";
  }
  if (isMissingGeminiModelError(error)) {
    return "Gemini no pudo leer la factura con los modelos disponibles. Reintentá en unos segundos.";
  }
  if (/GEMINI_API_KEY/i.test(errorText(error))) {
    return "Falta GEMINI_API_KEY en el servidor. Configurala en Vercel.";
  }

  const payload = parseGeminiErrorPayload(error);
  if (payload?.message?.trim()) {
    return payload.message.trim();
  }

  const text = errorText(error).trim();
  if (!text || text.startsWith("{")) return fallback;
  if (/server components render/i.test(text)) return fallback;
  return text;
}
