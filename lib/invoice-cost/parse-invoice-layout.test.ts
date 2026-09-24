import { describe, expect, it } from "vitest";
import { tryParseInvoicePdf } from "./parse-invoice-pdf";
import {
  parseCoAmount,
  parseCoAmountTokens,
  parseInvoiceFromTextItems,
  type PdfTextItem,
} from "./parse-invoice-layout";

function row(
  page: number,
  y: number,
  cells: Array<{ text: string; x: number; width?: number }>,
): PdfTextItem[] {
  return cells.map((cell) => ({
    text: cell.text,
    x: cell.x,
    y,
    width: cell.width ?? 36,
    page,
  }));
}

function calypsoItems(): PdfTextItem[] {
  return [
    ...row(1, 760, [{ text: "Razón social: CALYPSO S.A.S.", x: 40, width: 220 }]),
    ...row(1, 740, [
      { text: "Factura electrónica de venta No. FV-1024", x: 40, width: 280 },
    ]),
    ...row(1, 720, [{ text: "Fecha de emisión: 15/03/2026", x: 40, width: 200 }]),
    ...row(1, 680, [
      { text: "CODIGO", x: 40 },
      { text: "DESCRIPCIÓN", x: 120, width: 80 },
      { text: "UM", x: 360 },
      { text: "CANTIDAD", x: 430, width: 60 },
      { text: "VR", x: 530, width: 16 },
      { text: "TOTAL", x: 550, width: 36 },
    ]),
    ...row(1, 660, [
      { text: "C-1", x: 40 },
      { text: "CARTON CORRUGADO 1.25M X 100ML - PP", x: 120, width: 200 },
      { text: "MTR", x: 360 },
      { text: "300", x: 430 },
      { text: "592.389,06", x: 530, width: 70 },
    ]),
    ...row(1, 640, [
      { text: "P-2", x: 40 },
      { text: "POLIETILENO NEGRO 3M X CAL. 6 X 120ML", x: 120, width: 200 },
      { text: "KG", x: 360 },
      { text: "53,84", x: 430 },
      { text: "416.250,16", x: 530, width: 70 },
    ]),
    ...row(1, 628, [{ text: "PA", x: 120, width: 20 }]),
    ...row(1, 590, [
      { text: "SUBTOTAL", x: 40, width: 70 },
      { text: "847.596,00", x: 530, width: 70 },
    ]),
    ...row(1, 570, [
      { text: "IVA", x: 40 },
      { text: "161.043,22", x: 530, width: 70 },
    ]),
    ...row(1, 550, [
      { text: "TOTAL A PAGAR", x: 40, width: 90 },
      { text: "1.008.639,22", x: 530, width: 80 },
    ]),
  ];
}

describe("parseCoAmount", () => {
  it("lee miles con punto y decimales con coma", () => {
    expect(parseCoAmount("1.234.567,89")).toBe(1_234_567.89);
    expect(parseCoAmount("592.389,06")).toBe(592_389.06);
    expect(parseCoAmount("53,84")).toBe(53.84);
    expect(parseCoAmount("4.078.000")).toBe(4_078_000);
    expect(parseCoAmount("34,000")).toBe(34_000);
    expect(parseCoAmount("1,62")).toBe(1.62);
    expect(parseCoAmount("$ 300")).toBe(300);
  });

  it("no pega cantidad y precio en un solo número", () => {
    expect(parseCoAmountTokens("12 34.000")).toEqual([12, 34_000]);
    expect(parseCoAmountTokens("34 . 000")).toEqual([34_000]);
    expect(parseCoAmountTokens("7.752.019 408.000,00")).toEqual([
      7_752_019,
      408_000,
    ]);
  });
});

describe("parseInvoiceFromTextItems", () => {
  it("lee una tabla Calypso en MTR y KG sin inventar rollos", () => {
    const parsed = parseInvoiceFromTextItems(calypsoItems());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.invoice.supplierName).toBe("CALYPSO S.A.S.");
    expect(parsed.invoice.invoiceNumber).toBe("FV-1024");
    expect(parsed.invoice.invoiceDate).toBe("2026-03-15");
    expect(parsed.invoice.invoiceTotalConIva).toBe(1_008_639.22);
    expect(parsed.invoice.invoiceTotalNeto).toBe(847_596);
    expect(parsed.invoice.invoiceTotalIva).toBe(161_043.22);
    expect(parsed.invoice.lineTotalsIncludeIva).toBeNull();
    expect(parsed.invoice.lines).toEqual([
      {
        descripcion: "CARTON CORRUGADO 1.25M X 100ML - PP",
        um: "MTR",
        cantidad: 300,
        valorTotalNeto: 592_389.06,
        codigoProveedor: "C-1",
      },
      {
        descripcion: "POLIETILENO NEGRO 3M X CAL. 6 X 120ML PA",
        um: "KG",
        cantidad: 53.84,
        valorTotalNeto: 416_250.16,
        codigoProveedor: "P-2",
      },
    ]);
    expect(parsed.invoice.lines[1]?.numeroRollos).toBeUndefined();
    expect(parsed.invoice.lines[1]?.metrajeTotal).toBeUndefined();
  });

  it("lee líneas netas con columna de IVA aparte", () => {
    const items: PdfTextItem[] = [
      ...row(1, 700, [{ text: "Razón social: PLASTICOS ANDINOS SAS", x: 40, width: 240 }]),
      ...row(1, 680, [{ text: "Número de factura: FE-88", x: 40, width: 180 }]),
      ...row(1, 660, [{ text: "Fecha factura: 2026-01-09", x: 40, width: 180 }]),
      ...row(1, 620, [
        { text: "DESCRIPCION", x: 40, width: 80 },
        { text: "UM", x: 300 },
        { text: "CANTIDAD", x: 360, width: 60 },
        { text: "VR TOTAL", x: 460, width: 60 },
        { text: "VALOR IVA", x: 560, width: 60 },
      ]),
      ...row(1, 600, [
        { text: "Contenedor 16 oz", x: 40, width: 140 },
        { text: "CJ", x: 300 },
        { text: "20", x: 360 },
        { text: "4.078.000", x: 460, width: 70 },
        { text: "775.820", x: 560, width: 60 },
      ]),
      ...row(1, 560, [
        { text: "SUBTOTAL", x: 40 },
        { text: "4.078.000", x: 460, width: 70 },
      ]),
      ...row(1, 540, [
        { text: "IVA 19%", x: 40, width: 50 },
        { text: "775.820", x: 560, width: 60 },
      ]),
      ...row(1, 520, [
        { text: "TOTAL A PAGAR", x: 40, width: 90 },
        { text: "4.853.820", x: 460, width: 70 },
      ]),
    ];

    const parsed = parseInvoiceFromTextItems(items);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.invoice.invoiceNumber).toBe("FE-88");
    expect(parsed.invoice.invoiceDate).toBe("2026-01-09");
    expect(parsed.invoice.lines[0]).toMatchObject({
      descripcion: "Contenedor 16 oz",
      um: "CJ",
      cantidad: 20,
      valorTotalNeto: 4_078_000,
      valorIva: 775_820,
    });
  });

  it("rechaza cuando la suma de líneas no cuadra con el total", () => {
    const items: PdfTextItem[] = [
      ...row(1, 600, [
        { text: "DESCRIPCION", x: 40, width: 80 },
        { text: "CANTIDAD", x: 300, width: 60 },
        { text: "VR TOTAL", x: 420, width: 60 },
      ]),
      ...row(1, 580, [
        { text: "Vaso 7 oz", x: 40, width: 80 },
        { text: "2", x: 300 },
        { text: "100", x: 420 },
      ]),
      ...row(1, 540, [
        { text: "TOTAL A PAGAR", x: 40, width: 90 },
        { text: "900.000", x: 420, width: 60 },
      ]),
    ];

    expect(parseInvoiceFromTextItems(items)).toMatchObject({
      ok: false,
      reason: expect.stringContaining("no cuadra"),
      draft: {
        lines: [
          expect.objectContaining({
            descripcion: "Vaso 7 oz",
            cantidad: 2,
            valorTotalNeto: 100,
          }),
        ],
      },
    });
  });

  it("toma la cantidad y el total sin pegar el precio de al lado", () => {
    const items: PdfTextItem[] = [
      ...row(1, 600, [
        { text: "DESCRIPCION", x: 40, width: 80 },
        { text: "UM", x: 280 },
        { text: "CANTIDAD", x: 340, width: 60 },
        { text: "VR TOTAL", x: 480, width: 70 },
      ]),
      ...row(1, 580, [
        { text: "BANDEJA 1 BLANCO ESPUMADO GRANEL X 500", x: 40, width: 180 },
        { text: "PACA", x: 280, width: 40 },
        { text: "12", x: 340, width: 16 },
        { text: "34.000", x: 370, width: 40 },
        { text: "408.000,00", x: 480, width: 70 },
      ]),
      ...row(1, 540, [
        { text: "TOTAL A PAGAR", x: 40, width: 90 },
        { text: "408.000,00", x: 480, width: 70 },
      ]),
    ];

    const parsed = parseInvoiceFromTextItems(items);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.invoice.lines[0]).toMatchObject({
      um: "PACA",
      cantidad: 12,
      precioUnitario: 34_000,
      valorTotalNeto: 408_000,
    });
  });

  it("lee la columna de precio unitario", () => {
    const items: PdfTextItem[] = [
      ...row(1, 600, [
        { text: "DESCRIPCION", x: 40, width: 80 },
        { text: "UM", x: 250 },
        { text: "CANTIDAD", x: 310, width: 60 },
        { text: "VR UNITARIO", x: 390, width: 70 },
        { text: "VR TOTAL", x: 500, width: 70 },
      ]),
      ...row(1, 580, [
        { text: "BANDEJA 1 BLANCO ESPUMADO GRANEL X 500", x: 40, width: 160 },
        { text: "PACA", x: 250, width: 40 },
        { text: "12", x: 310, width: 16 },
        { text: "27.193,28", x: 390, width: 60 },
        { text: "326.319,36", x: 500, width: 70 },
      ]),
      ...row(1, 540, [
        { text: "TOTAL A PAGAR", x: 40, width: 90 },
        { text: "326.319,36", x: 500, width: 70 },
      ]),
    ];

    const parsed = parseInvoiceFromTextItems(items);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.invoice.lines[0]?.precioUnitario).toBeCloseTo(27_193.28, 2);
    expect(parsed.invoice.lines[0]?.cantidad).toBe(12);
  });

  it("no toma el 0,00 de la derecha como total cuando el monto está alineado a la derecha", () => {
    const items: PdfTextItem[] = [
      ...row(1, 600, [
        { text: "DESCRIPCION", x: 40, width: 80 },
        { text: "UM", x: 240, width: 24 },
        { text: "CANTIDAD", x: 300, width: 70 },
        { text: "VR UNITARIO", x: 400, width: 80 },
        { text: "VR TOTAL", x: 560, width: 50 },
      ]),
      ...row(1, 580, [
        { text: "10283 BANDEJA 1 BLANCO ESPUMADO GRANEL X 500", x: 40, width: 180 },
        { text: "PACA", x: 240, width: 36 },
        { text: "12", x: 340, width: 20 },
        { text: "34.000", x: 400, width: 70 },
        { text: "408.000,00", x: 470, width: 110 },
        { text: "0,00", x: 590, width: 28 },
      ]),
      ...row(1, 540, [
        { text: "TOTAL A PAGAR", x: 40, width: 90 },
        { text: "408.000,00", x: 500, width: 110 },
      ]),
    ];

    const parsed = parseInvoiceFromTextItems(items);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.invoice.lines[0]).toMatchObject({
      cantidad: 12,
      precioUnitario: 34_000,
      valorTotalNeto: 408_000,
    });
  });

  it("rechaza texto sin tabla", () => {
    const items = row(1, 700, [
      {
        text: "Este documento no es una factura de compra con columnas de producto.",
        x: 40,
        width: 400,
      },
    ]);
    expect(parseInvoiceFromTextItems(items).ok).toBe(false);
  });
});

describe("tryParseInvoicePdf", () => {
  it("rechaza un PDF sin texto", async () => {
    const parsed = await tryParseInvoicePdf(buildPdf("BT ET\n"));
    expect(parsed).toEqual({ ok: false, reason: "PDF sin texto suficiente" });
  });

  it("lee un PDF digital con la misma tabla", async () => {
    const stream = [
      "BT",
      "/F1 9 Tf",
      "1 0 0 1 40 740 Tm (Razon social: CALYPSO S.A.S.) Tj",
      "1 0 0 1 40 720 Tm (Factura electronica de venta No. FV-1024) Tj",
      "1 0 0 1 40 700 Tm (Fecha de emision: 15/03/2026) Tj",
      "1 0 0 1 40 660 Tm (DESCRIPCION) Tj",
      "1 0 0 1 340 660 Tm (UM) Tj",
      "1 0 0 1 400 660 Tm (CANTIDAD) Tj",
      "1 0 0 1 500 660 Tm (VR TOTAL) Tj",
      "1 0 0 1 40 640 Tm (CARTON CORRUGADO 1.25M X 100ML - PP) Tj",
      "1 0 0 1 340 640 Tm (MTR) Tj",
      "1 0 0 1 400 640 Tm (300) Tj",
      "1 0 0 1 500 640 Tm (592.389,06) Tj",
      "1 0 0 1 40 600 Tm (TOTAL A PAGAR) Tj",
      "1 0 0 1 500 600 Tm (592.389,06) Tj",
      "ET",
      "",
    ].join("\n");

    const parsed = await tryParseInvoicePdf(buildPdf(stream));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.invoice.invoiceNumber).toBe("FV-1024");
    expect(parsed.invoice.lines[0]).toMatchObject({
      descripcion: "CARTON CORRUGADO 1.25M X 100ML - PP",
      um: "MTR",
      cantidad: 300,
      valorTotalNeto: 592_389.06,
    });
  });
});

function buildPdf(stream: string): Uint8Array {
  const streamBody = stream.endsWith("\n") ? stream : `${stream}\n`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }

  const xrefAt = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(body + xref + trailer);
}
