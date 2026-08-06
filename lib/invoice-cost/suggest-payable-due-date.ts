/**
 * Sugiere el día del calendario CxP posterior a la última factura agendada.
 * "Continua" = siguiente YYYY-MM-DD después del max(due_date).
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Normaliza a YYYY-MM-DD o null. */
export function toDateOnlyYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  const head = value.includes("T") ? value.slice(0, 10) : value.trim().slice(0, 10);
  return YMD.test(head) ? head : null;
}

/** Suma N días a una fecha calendario YYYY-MM-DD (sin timezone). */
export function addCalendarDays(ymd: string, days: number): string | null {
  const parsed = toDateOnlyYmd(ymd);
  if (!parsed) return null;
  const m = YMD.exec(parsed);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export interface SuggestPayableDueDateResult {
  /** Última due_date encontrada (o null si no hay). */
  lastDueDate: string | null;
  /** Día siguiente a la última (o fallback). */
  suggestedDueDate: string;
  /** Cómo se obtuvo la sugerencia. */
  source: "after_last" | "fallback_today";
}

/**
 * @param lastDueDates - fechas due_date existentes (cualquier orden)
 * @param fallbackToday - YYYY-MM-DD si no hay facturas previas
 */
export function suggestPayableDueDate(
  lastDueDates: Array<string | null | undefined>,
  fallbackToday: string,
): SuggestPayableDueDateResult {
  const dates = lastDueDates
    .map(toDateOnlyYmd)
    .filter((d): d is string => d != null)
    .sort();

  const lastDueDate = dates.length > 0 ? dates[dates.length - 1]! : null;
  if (lastDueDate) {
    const next = addCalendarDays(lastDueDate, 1);
    if (next) {
      return {
        lastDueDate,
        suggestedDueDate: next,
        source: "after_last",
      };
    }
  }

  const today = toDateOnlyYmd(fallbackToday) ?? fallbackToday.slice(0, 10);
  return {
    lastDueDate: null,
    suggestedDueDate: today,
    source: "fallback_today",
  };
}
