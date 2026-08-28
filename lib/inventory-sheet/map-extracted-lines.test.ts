import { describe, expect, it } from "vitest";
import { formatCodeFromId, normalizeFormatCode } from "./format-code";
import { mapExtractedSheetToConfirmRows } from "./map-extracted-lines";
import type { InvoiceMatchProduct } from "@/lib/invoice-cost/match-products";

const catalog: InvoiceMatchProduct[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Vaso 7 Oz Vacan",
    presentation: "Rollo",
    packaging: "Paca x43",
    cost: 1000,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Bombonera",
    presentation: "Paquete",
    packaging: "Cj x1000",
    cost: 2000,
  },
];

describe("formatCodeFromId", () => {
  it("FMT- + 6 hex del uuid", () => {
    expect(formatCodeFromId("a1b2c3d4-e5f6-4789-abcd-1234567890ab")).toBe(
      "FMT-A1B2C3",
    );
  });
});

describe("normalizeFormatCode", () => {
  it("acepta con o sin prefijo", () => {
    expect(normalizeFormatCode("fmt-a1b2c3")).toBe("FMT-A1B2C3");
    expect(normalizeFormatCode("A1B2C3")).toBe("FMT-A1B2C3");
  });
});

describe("mapExtractedSheetToConfirmRows", () => {
  const formatLines = [
    {
      productId: catalog[0]!.id,
      name: catalog[0]!.name,
      presentation: catalog[0]!.presentation ?? null,
      packaging: catalog[0]!.packaging ?? null,
      cost: catalog[0]!.cost,
      stockQuantity: 10,
      sortOrder: 0,
    },
    {
      productId: catalog[1]!.id,
      name: catalog[1]!.name,
      presentation: catalog[1]!.presentation ?? null,
      packaging: catalog[1]!.packaging ?? null,
      cost: catalog[1]!.cost,
      stockQuantity: 5,
      sortOrder: 1,
    },
  ];

  it("mapea cantidad por número de fila del formato", () => {
    const rows = mapExtractedSheetToConfirmRows({
      formatLines,
      catalog,
      extractedLines: [
        { rowIndex: 1, descripcion: "Vaso 7oz", cantidad: 38, skipped: false },
        {
          rowIndex: 2,
          descripcion: "Bomboneras",
          cantidad: 0,
          skipped: true,
          skipReason: "NO HAY",
        },
      ],
    });
    expect(rows[0]?.productId).toBe(catalog[0]!.id);
    expect(rows[0]?.quantity).toBe(38);
    expect(rows[0]?.include).toBe(true);
    expect(rows[0]?.matchConfidence).toBe("format");
    expect(rows[1]?.include).toBe(false);
    expect(rows[1]?.skipped).toBe(true);
  });

  it("omite NO HAY aunque venga cantidad", () => {
    const rows = mapExtractedSheetToConfirmRows({
      formatLines: [formatLines[0]!],
      catalog,
      extractedLines: [
        {
          rowIndex: 1,
          descripcion: "Vaso",
          cantidad: 1,
          skipped: true,
          skipReason: "NO HAY",
        },
      ],
    });
    expect(rows[0]?.include).toBe(false);
    expect(rows[0]?.quantity).toBe(0);
  });

  it("agrega líneas extra por similitud", () => {
    const rows = mapExtractedSheetToConfirmRows({
      formatLines: [formatLines[0]!],
      catalog,
      extractedLines: [
        { rowIndex: 1, descripcion: "Vaso 7 Oz Vacan", cantidad: 2, skipped: false },
        { rowIndex: 2, descripcion: "Bombonera x1000", cantidad: 4, skipped: false },
      ],
    });
    const extra = rows.find((r) => r.extra);
    expect(extra?.productId).toBe(catalog[1]!.id);
    expect(extra?.quantity).toBe(4);
  });

  it("interpreta lista manuscrita de entrada sin formato FMT", () => {
    const entradaCatalog: InvoiceMatchProduct[] = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Bandeja #7",
        presentation: null,
        packaging: "Paca x50",
        cost: 800,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Bandeja #1",
        presentation: null,
        packaging: "Paca x50",
        cost: 700,
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "Vaso 14 oz",
        presentation: null,
        packaging: "Paca x20",
        cost: 1200,
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        name: "Vaso 5 oz Transparente",
        presentation: null,
        packaging: "Paca x50",
        cost: 900,
      },
    ];
    const rows = mapExtractedSheetToConfirmRows({
      formatLines: [],
      catalog: entradaCatalog,
      extractedLines: [
        { rowIndex: 1, descripcion: "2 - Bandeja #7", cantidad: 2, skipped: false },
        { rowIndex: 2, descripcion: "3 - Bandeja #1", cantidad: 3, skipped: false },
        { rowIndex: 3, descripcion: "3 - Vaso 14 oz", cantidad: 3, skipped: false },
        {
          rowIndex: 4,
          descripcion: '7 - " 5 oz Transparente',
          cantidad: 7,
          skipped: false,
        },
      ],
    });
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.extra)).toBe(true);
    expect(rows[0]?.productId).toBe(entradaCatalog[0]!.id);
    expect(rows[0]?.quantity).toBe(2);
    expect(rows[0]?.include).toBe(true);
    expect(rows[1]?.productId).toBe(entradaCatalog[1]!.id);
    expect(rows[2]?.productId).toBe(entradaCatalog[2]!.id);
    expect(rows[3]?.descripcion).toBe("Vaso 5 oz Transparente");
    expect(rows[3]?.productId).toBe(entradaCatalog[3]!.id);
    expect(rows[3]?.quantity).toBe(7);
  });
});
