/**
 * Fechas calendario (sin hora) en hora local Colombia / inputs type="date".
 * Evita el desfase “un día antes” al usar toISOString() o new Date("YYYY-MM-DD").
 */

/** Valor para `<input type="date" />` en la zona horaria del navegador. */
export function localDateInputValue(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

const ES_CO_LOCALE = "es-CO";
const COLOMBIA_TZ = "America/Bogota";

/** Intl en Node vs navegador puede usar NBSP distinto (p. ej. "a. m."); unifica para hidratación. */
export function normalizeIntlOutput(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

/**
 * Muestra una fecha solo-día (columna `date` o prefijo YYYY-MM-DD) en es-CO.
 */
export function formatDateOnlyEsCO(value: string | null | undefined): string {
  if (!value) return "—";
  const head = value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
  const m = YMD.exec(head);
  if (!m) {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return normalizeIntlOutput(
        d.toLocaleDateString(ES_CO_LOCALE, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: COLOMBIA_TZ,
        }),
      );
    } catch {
      return value;
    }
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const local = new Date(y, mo - 1, d);
  return normalizeIntlOutput(
    local.toLocaleDateString(ES_CO_LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  );
}

/** Fecha y hora local desde un ISO timestamptz (p. ej. Supabase). */
export function formatDateTimeEsCO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return normalizeIntlOutput(
    d.toLocaleString(ES_CO_LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: COLOMBIA_TZ,
    }),
  );
}

/** dd/mm/yyyy, hh:mm — estable entre SSR y cliente (sin NBSP en a. m.). */
export function formatDateTimeNumericEsCO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return normalizeIntlOutput(
    d.toLocaleString(ES_CO_LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: COLOMBIA_TZ,
    }),
  );
}

/** Solo hora (hh:mm) — estable entre SSR y cliente. */
export function formatTimeEsCO(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return normalizeIntlOutput(
    d.toLocaleTimeString(ES_CO_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: COLOMBIA_TZ,
    }),
  );
}
