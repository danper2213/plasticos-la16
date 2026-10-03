import { describe, expect, it } from "vitest";
import { extractedToRawLines } from "./extract-invoice-shared";
import { processInvoiceLines } from "./process-invoice-line";
import { formatPdfRows, tryParseInvoicePdf } from "./parse-invoice-pdf";
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
    expect(parseCoAmount("30.000")).toBe(30_000);
    expect(parseCoAmount("30.000", "us")).toBe(30);
    expect(parseCoAmount("22,269.00", "us")).toBe(22_269);
    expect(parseCoAmount("668,070.00", "us")).toBe(668_070);
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

  it("lee una factura SIESA sin pegar el pie ni el 30.000 como precio", () => {
    const parsed = parseInvoiceFromTextItems(siesaItems());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.invoice.supplierName).toBe("DISTRIBUIDORA CALIPLASTICOS LTDA");
    expect(parsed.invoice.invoiceNumber).toBe("RIBA3426");
    expect(parsed.invoice.invoiceDate).toBe("2026-09-19");
    expect(parsed.invoice.invoiceTotalNeto).toBe(668_070);
    expect(parsed.invoice.invoiceTotalIva).toBe(126_933);
    expect(parsed.invoice.invoiceTotalConIva).toBe(795_003);
    expect(parsed.invoice.lines).toEqual([
      {
        descripcion: "PISO CIRCULIN TRANSPARENTE X 1.40",
        um: "MT",
        cantidad: 30,
        valorTotalNeto: 668_070,
        precioUnitario: 22_269,
        codigoProveedor: "015267",
      },
    ]);
  });
});

describe("factura Lastra", () => {
  it("no toma el número de línea como cantidad ni el conteo de líneas como total", () => {
    const parsed = parseInvoiceFromTextItems(lastraItems());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.invoice.supplierName).toBe("REPRESENTACIONES LASTRA S.A.S");
    expect(parsed.invoice.invoiceTotalNeto).toBe(2_834_714);
    expect(parsed.invoice.invoiceTotalIva).toBe(538_596);
    expect(parsed.invoice.invoiceTotalConIva).toBe(3_373_310);
    expect(parsed.invoice.lines).toEqual([
      {
        descripcion: "10716 PLATO HONDO 25 ONZ ESPUMADO BLANCO",
        um: "C24",
        cantidad: 15,
        valorTotalNeto: 1_419_000,
        precioUnitario: 94_600,
      },
      {
        descripcion: "10264 PLATO PANDO 15.5 CM ESPUMADO BLANCO",
        um: "C24",
        cantidad: 20,
        valorTotalNeto: 836_000,
        precioUnitario: 41_800,
      },
      {
        descripcion: "10810 VASO 22 ONZ BIO GOLD",
        um: "C24",
        cantidad: 2,
        valorTotalNeto: 579_714,
        precioUnitario: 289_856.8,
      },
    ]);

    const processed = processInvoiceLines(
      extractedToRawLines(parsed.invoice),
      parsed.invoice.lines.map((line, index) => ({
        id: `p${index}`,
        name: line.descripcion,
        packaging: "Cj x24",
        cost: 100,
      })),
      {
        headerTotalWithIva: parsed.invoice.invoiceTotalConIva,
        headerTotalNeto: parsed.invoice.invoiceTotalNeto,
        headerIvaAmount: parsed.invoice.invoiceTotalIva,
      },
    );

    expect(processed.map((line) => line.cost.pricedFromUnitPrice)).toEqual([
      true,
      true,
      true,
    ]);
    expect(processed.map((line) => line.cost.costoUnitario)).toEqual([
      4_690.58,
      2_072.58,
      14_372.07,
    ]);
  });

  it("arma el texto de Gemini de izquierda a derecha", () => {
    const text = formatPdfRows([
      { text: "1,419,000.00", x: 555, y: 532.8, width: 40, page: 1 },
      { text: "1", x: 26, y: 532.6, width: 4, page: 1 },
      { text: "C24", x: 252, y: 532.1, width: 12, page: 1 },
      { text: "10716 PLATO HONDO", x: 49, y: 531.8, width: 170, page: 1 },
      { text: "15", x: 317, y: 532.8, width: 8, page: 1 },
    ]);
    expect(text).toBe("1 | 10716 PLATO HONDO | C24 | 15 | 1,419,000.00");
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

function lastraItems(): PdfTextItem[] {
  return [
    ...row(1, 760, [
      { text: "FACTURA ELECTRONICA DE", x: 27, width: 120 },
      { text: "REPRESENTACIONES LASTRA S.A.S", x: 160, width: 180 },
    ]),
    ...row(1, 740, [{ text: "VENTA", x: 27, width: 30 }]),
    ...row(1, 546, [
      { text: "Reg", x: 25.6, width: 15.1 },
      { text: "Descripcion", x: 46.7, width: 45.8 },
      { text: "U.M.", x: 254.5, width: 16.9 },
      { text: "Cantidad", x: 288.2, width: 34.2 },
      { text: "Precio unitario", x: 335.5, width: 55.9 },
      { text: "Descuento", x: 402.8, width: 40.9 },
      { text: "Impuestos", x: 461.3, width: 40 },
      { text: "%", x: 510.7, width: 7.1 },
      { text: "Valor total", x: 539.1, width: 39.1 },
    ]),
    ...row(1, 532, [
      { text: "1", x: 26.3, width: 3.9 },
      { text: "10716 PLATO HONDO 25 ONZ ESPUMADO BLANCO", x: 49.1, width: 171.4 },
      { text: "C24", x: 252.2, width: 12.4 },
      { text: "15", x: 317, width: 7.5 },
      { text: "94,600.00", x: 332, width: 30 },
      { text: "$0", x: 447.6, width: 7.5 },
      { text: "$269,610", x: 475, width: 28.1 },
      { text: "19", x: 512.5, width: 7.5 },
      { text: "1,419,000.00", x: 555.7, width: 39.4 },
    ]),
    ...row(1, 522, [
      { text: "2", x: 26.3, width: 3.9 },
      { text: "10264 PLATO PANDO 15.5 CM ESPUMADO BLANCO", x: 49.1, width: 172.2 },
      { text: "C24", x: 252.2, width: 12.4 },
      { text: "20", x: 317, width: 7.5 },
      { text: "41,800.00", x: 332, width: 30 },
      { text: "$0", x: 447.6, width: 7.5 },
      { text: "$158,840", x: 475, width: 28.1 },
      { text: "19", x: 512.5, width: 7.5 },
      { text: "836,000.00", x: 561.3, width: 33.8 },
    ]),
    ...row(1, 511, [
      { text: "3", x: 26.3, width: 3.9 },
      { text: "10810 VASO 22 ONZ BIO GOLD", x: 49.1, width: 103 },
      { text: "C24", x: 252.2, width: 12.4 },
      { text: "2", x: 320.7, width: 3.8 },
      { text: "289,856.80", x: 332, width: 33.8 },
      { text: "$0", x: 447.6, width: 7.5 },
      { text: "$110,146", x: 475, width: 28.1 },
      { text: "19", x: 512.5, width: 7.5 },
      { text: "579,714.00", x: 561.3, width: 33.8 },
    ]),
    ...row(1, 330, [
      { text: "TOTAL NRO LINEAS :", x: 25.6, width: 83 },
      { text: "3", x: 175.9, width: 4.4 },
    ]),
    ...row(1, 307, [
      {
        text: "de cambio Art. 779 del Codigo de Comercio. Se causara intereses por mora",
        x: 31.9,
        width: 385,
      },
      { text: "Valor Bruto:", x: 445.6, width: 46.2 },
      { text: "$2,834,714", x: 555.2, width: 40 },
    ]),
    ...row(1, 277, [
      { text: "Subtotal:", x: 445.3, width: 40 },
      { text: "$2,834,714", x: 555.1, width: 40 },
    ]),
    ...row(1, 263, [
      { text: "IVA:", x: 445.3, width: 20 },
      { text: "$538,596", x: 561.8, width: 36 },
    ]),
    ...row(1, 214.8, [{ text: "Firma y Sello:", x: 249.7, width: 50 }]),
    ...row(1, 213.2, [{ text: "Total:", x: 445.3, width: 28 }]),
    ...row(1, 211.4, [{ text: "$3,373,310", x: 545.4, width: 40 }]),
  ];
}

function siesaItems(): PdfTextItem[] {
  return [
    ...row(1, 753.2, [
      { text: "DISTRIBUIDORA CALIPLASTICOS LTDA", x: 211.7, width: 134.4 },
      { text: "+----------------------------------------+", x: 421.7, width: 176.4 },
    ]),
    ...row(1, 721.7, [{ text: "| Numero: RIBA3426", x: 421.7, width: 75.6 }]),
    ...row(1, 711.2, [
      { text: "| Fecha de Emision: 2026-SEP-19", x: 421.7, width: 130.2 },
    ]),
    ...row(1, 574.7, [
      { text: "|Reg", x: 22.7, width: 16.8 },
      { text: "Referencia", x: 43.7, width: 42 },
      { text: "D e s c r i p c i o n", x: 127.7, width: 88.2 },
      { text: "Mo", x: 299.9, width: 8.4 },
      { text: "Cantidad", x: 329.3, width: 33.6 },
      { text: "U.M Precio_Unit.", x: 371.3, width: 67.2 },
      { text: "Descuento", x: 459.5, width: 37.8 },
      { text: "Valor_Total", x: 514.1, width: 46.2 },
      { text: "Impto", x: 568.7, width: 21 },
    ]),
    ...row(1, 553.7, [
      { text: "|001", x: 22.7, width: 16.8 },
      { text: "015267", x: 43.7, width: 25.2 },
      { text: "PISO CIRCULIN TRANSPARENTE X 1.40", x: 127.7, width: 138.6 },
      { text: "70", x: 299.9, width: 8.4 },
      { text: "30.000", x: 337.7, width: 25.2 },
      { text: "MT", x: 371.3, width: 8.4 },
      { text: "22,269.00", x: 400.7, width: 37.8 },
      { text: "0.00", x: 480.5, width: 16.8 },
      { text: "668,070.00", x: 518.3, width: 42 },
      { text: "19.00", x: 568.7, width: 21 },
    ]),
    ...row(1, 364.7, [
      { text: "|Total", x: 22.7, width: 25.2 },
      { text: "de", x: 52.1, width: 8.4 },
      { text: "Registros:", x: 64.7, width: 42 },
      { text: "000001", x: 110.9, width: 25.2 },
      { text: "Total Cantidades:", x: 157.1, width: 71.4 },
      { text: "30.000", x: 287.3, width: 25.2 },
    ]),
    ...row(1, 343.7, [
      { text: "TOTAL_BRUTO", x: 43.7, width: 46.2 },
      { text: "DSCTO x LINEA", x: 115.1, width: 54.6 },
      { text: "DSCTO_GLOBAL 0.00% |", x: 194.9, width: 84 },
      { text: "SUB-TOTAL", x: 299.9, width: 37.8 },
      { text: "IMPUESTOS", x: 379.7, width: 37.8 },
      { text: "| TOTAL RETENCIONES|", x: 434.3, width: 84 },
      { text: "T", x: 539.3, width: 4.2 },
      { text: "O", x: 547.7, width: 4.2 },
      { text: "T", x: 556.1, width: 4.2 },
      { text: "A", x: 564.5, width: 4.2 },
      { text: "L", x: 572.9, width: 4.2 },
    ]),
    ...row(1, 333.2, [
      { text: "668,070.00", x: 56.3, width: 42 },
      { text: "0.00 |", x: 161.3, width: 25.2 },
      { text: "0.00", x: 249.5, width: 16.8 },
      { text: "668,070.00 |", x: 308.3, width: 50.4 },
      { text: "126,933.00 |", x: 388.1, width: 50.4 },
      { text: "0.00", x: 493.1, width: 16.8 },
      { text: "795,003.00", x: 547.7, width: 42 },
    ]),
    ...row(1, 312.2, [
      {
        text: "| Valor Letras : SETECIENTOS NOVENTA Y CINCO MIL TRES PESOS MCTE.",
        x: 22.7,
        width: 280,
      },
    ]),
    ...row(1, 217.7, [
      {
        text: "| Observacion: REMISION FACTURA ELECTRONICA No 0592",
        x: 22.7,
        width: 220,
      },
    ]),
  ];
}

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
