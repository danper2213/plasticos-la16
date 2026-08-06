import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  suggestPayableDueDate,
  toDateOnlyYmd,
} from "./suggest-payable-due-date";

describe("addCalendarDays", () => {
  it("suma un día", () => {
    expect(addCalendarDays("2026-09-03", 1)).toBe("2026-09-04");
  });

  it("cruza de mes", () => {
    expect(addCalendarDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});

describe("suggestPayableDueDate", () => {
  it("usa el día siguiente a la última factura", () => {
    const result = suggestPayableDueDate(
      ["2026-09-01", "2026-09-03T12:00:00.000Z", "2026-08-28"],
      "2026-09-10",
    );
    expect(result.lastDueDate).toBe("2026-09-03");
    expect(result.suggestedDueDate).toBe("2026-09-04");
    expect(result.source).toBe("after_last");
  });

  it("cae a hoy si no hay facturas", () => {
    const result = suggestPayableDueDate([], "2026-09-10");
    expect(result.lastDueDate).toBeNull();
    expect(result.suggestedDueDate).toBe("2026-09-10");
    expect(result.source).toBe("fallback_today");
  });
});

describe("toDateOnlyYmd", () => {
  it("tolera ISO con hora", () => {
    expect(toDateOnlyYmd("2026-09-03T12:00:00.000Z")).toBe("2026-09-03");
  });
});
