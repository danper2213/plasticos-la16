import { describe, expect, it } from "vitest";
import { normalizeHandwrittenSheetLines } from "./normalize-handwritten-lines";
import type { ExtractedSheetLine } from "./extract-sheet-shared";

function line(
  rowIndex: number,
  descripcion: string,
  cantidad: number,
): ExtractedSheetLine {
  return { rowIndex, descripcion, cantidad, skipped: false };
}

describe("normalizeHandwrittenSheetLines", () => {
  it("quita cantidad del nombre y expande comillas de la lista de entrada", () => {
    const lines = normalizeHandwrittenSheetLines([
      line(1, "2 - Bandeja #7", 2),
      line(2, "3 - Bandeja #1", 3),
      line(3, "2 - tapa 9, 10, 12", 2),
      line(4, '1 - " 13, 14, 16', 1),
      line(5, "3 - Vaso 14 oz", 3),
      line(6, "7 - Vaso 16 oz", 7),
      line(7, "1 - Vaso 3.5 oz", 1),
      line(8, "2 - Vaso 10 oz", 2),
      line(9, "4 - Vaso 12 oz", 4),
      line(10, "4 - Vaso 5 oz Blanco", 4),
      line(11, '7 - " 5 oz Transparente', 7),
      line(12, '3 - " 9 oz', 3),
      line(13, "1 - contenedor 24 oz", 1),
      line(14, "2 - COPA 2 oz tapa Bebedor", 2),
    ]);

    expect(lines.map((l) => l.descripcion)).toEqual([
      "Bandeja #7",
      "Bandeja #1",
      "tapa 9, 10, 12",
      "tapa 13, 14, 16",
      "Vaso 14 oz",
      "Vaso 16 oz",
      "Vaso 3.5 oz",
      "Vaso 10 oz",
      "Vaso 12 oz",
      "Vaso 5 oz Blanco",
      "Vaso 5 oz Transparente",
      "Vaso 9 oz",
      "contenedor 24 oz",
      "COPA 2 oz tapa Bebedor",
    ]);
    expect(lines.map((l) => l.cantidad)).toEqual([
      2, 3, 2, 1, 3, 7, 1, 2, 4, 4, 7, 3, 1, 2,
    ]);
  });

  it("completa renglones que solo traen talle si Gemini no dejó comillas", () => {
    const lines = normalizeHandwrittenSheetLines([
      line(1, "Tapa 9, 10, 12", 2),
      line(2, "13, 14, 16", 1),
      line(3, "Vaso 5 oz Blanco", 4),
      line(4, "5 oz Transparente", 7),
    ]);
    expect(lines[1]?.descripcion).toBe("Tapa 13, 14, 16");
    expect(lines[3]?.descripcion).toBe("Vaso 5 oz Transparente");
  });
});
