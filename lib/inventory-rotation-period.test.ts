import { describe, expect, it } from "vitest";
import {
  clampRotationMonth,
  INVENTORY_ROTATION_START,
  listRotationMonths,
  rotationMonthRange,
  shiftRotationMonth,
} from "./inventory-rotation-period";

describe("inventory rotation period", () => {
  const nowSep2026 = new Date("2026-09-02T15:00:00-05:00");
  const nowOct2026 = new Date("2026-10-15T12:00:00-05:00");

  it("no permite meses anteriores a septiembre 2026", () => {
    expect(clampRotationMonth(8, 2026, nowSep2026)).toEqual({
      month: INVENTORY_ROTATION_START.month,
      year: INVENTORY_ROTATION_START.year,
    });
  });

  it("no permite meses futuros", () => {
    expect(clampRotationMonth(11, 2026, nowSep2026)).toEqual({
      month: 9,
      year: 2026,
    });
  });

  it("lista meses desde septiembre hasta el actual", () => {
    const months = listRotationMonths(nowOct2026);
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual([
      "2026-9",
      "2026-10",
    ]);
  });

  it("calcula el rango del mes", () => {
    expect(rotationMonthRange(9, 2026)).toEqual({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    });
  });

  it("desplaza el mes y lo recorta al rango válido", () => {
    expect(shiftRotationMonth(9, 2026, -1, nowOct2026)).toEqual({
      month: 9,
      year: 2026,
    });
    expect(shiftRotationMonth(9, 2026, 1, nowOct2026)).toEqual({
      month: 10,
      year: 2026,
    });
  });
});
