import { todayDateColombia } from "@/lib/calendar-date";

/** Primer mes del ranking de rotación (septiembre 2026). */
export const INVENTORY_ROTATION_START = { month: 9, year: 2026 } as const;

export type YearMonth = { month: number; year: number };

function cmpYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function currentYearMonthColombia(now: Date = new Date()): YearMonth {
  const ymd = todayDateColombia(now);
  return {
    year: Number(ymd.slice(0, 4)),
    month: Number(ymd.slice(5, 7)),
  };
}

/** Mes máximo consultable: el actual, o el de inicio si el reloj está antes. */
export function rotationMaxMonth(now: Date = new Date()): YearMonth {
  const current = currentYearMonthColombia(now);
  return cmpYearMonth(current, INVENTORY_ROTATION_START) < 0
    ? { month: INVENTORY_ROTATION_START.month, year: INVENTORY_ROTATION_START.year }
    : current;
}

export function clampRotationMonth(
  month: number,
  year: number,
  now: Date = new Date(),
): YearMonth {
  const safeMonth = Number.isFinite(month) ? Math.min(12, Math.max(1, Math.round(month))) : 1;
  const safeYear = Number.isFinite(year) && year > 0 ? Math.round(year) : INVENTORY_ROTATION_START.year;
  const start: YearMonth = {
    month: INVENTORY_ROTATION_START.month,
    year: INVENTORY_ROTATION_START.year,
  };
  const max = rotationMaxMonth(now);
  let value: YearMonth = { month: safeMonth, year: safeYear };
  if (cmpYearMonth(value, start) < 0) value = start;
  if (cmpYearMonth(value, max) > 0) value = max;
  return value;
}

export function rotationMonthRange(month: number, year: number): {
  dateFrom: string;
  dateTo: string;
} {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function rotationMonthLabel(month: number, year: number): string {
  const raw = new Date(year, month - 1, 1).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function listRotationMonths(now: Date = new Date()): Array<YearMonth & { label: string }> {
  const start: YearMonth = {
    month: INVENTORY_ROTATION_START.month,
    year: INVENTORY_ROTATION_START.year,
  };
  const max = rotationMaxMonth(now);
  const months: Array<YearMonth & { label: string }> = [];
  let y = start.year;
  let m = start.month;
  while (y < max.year || (y === max.year && m <= max.month)) {
    months.push({ month: m, year: y, label: rotationMonthLabel(m, y) });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export function shiftRotationMonth(
  month: number,
  year: number,
  delta: number,
  now: Date = new Date(),
): YearMonth {
  let m = month + delta;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return clampRotationMonth(m, y, now);
}

export function isSameYearMonth(a: YearMonth, b: YearMonth): boolean {
  return a.month === b.month && a.year === b.year;
}
