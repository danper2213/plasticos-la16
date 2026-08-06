import { describe, expect, it } from "vitest";
import {
  extractedToRawLines,
  type ExtractedInvoice,
} from "./extract-invoice-shared";

describe("extractedToRawLines", () => {
  it("normaliza UM y mapea campos", () => {
    const extracted: ExtractedInvoice = {
      supplierName: "Proveedor Demo",
      invoiceNumber: "FV-1",
      lines: [
        {
          descripcion: "Contenedor 16 oz - CJ x 400 un",
          um: "cj",
          cantidad: 20,
          valorTotalNeto: 4_078_000,
          valorIva: 775_820,
          codigoProveedor: "ABC",
        },
      ],
    };

    expect(extractedToRawLines(extracted)).toEqual([
      {
        descripcion: "Contenedor 16 oz - CJ x 400 un",
        um: "CJ",
        cantidad: 20,
        valorTotalNeto: 4_078_000,
        valorIva: 775_820,
        codigoProveedor: "ABC",
        metrosPorUnidad: null,
        numeroRollos: null,
        metrajeTotal: null,
      },
    ]);
  });
});
