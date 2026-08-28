const CODE_PREFIX = "FMT-";

/** Código corto imprimible a partir del UUID del formato. */
export function formatCodeFromId(id: string): string {
  const compact = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${CODE_PREFIX}${compact}`;
}

export function normalizeFormatCode(raw: string | null | undefined): string | null {
  const t = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!t) return null;
  const withPrefix = t.startsWith(CODE_PREFIX) ? t : `${CODE_PREFIX}${t.replace(/^FMT\s*-?\s*/i, "")}`;
  const compact = withPrefix.replace(/[^A-Z0-9-]/g, "");
  return compact.length >= 6 ? compact : null;
}
