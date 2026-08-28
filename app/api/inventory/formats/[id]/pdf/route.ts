import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getInventorySheetFormat } from "@/app/dashboard/inventory/sheet-actions";
import { InventorySheetPdfDocument } from "@/lib/pdf/inventory-sheet-pdf-document";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const detail = await getInventorySheetFormat(id);
  if (!detail) {
    return NextResponse.json({ error: "Formato no encontrado" }, { status: 404 });
  }

  const doc = React.createElement(InventorySheetPdfDocument, {
    code: detail.code,
    formatName: detail.name,
    defaultMovementType: detail.defaultMovementType,
    notes: detail.notes,
    lines: detail.lines.map((l) => ({
      name: l.name,
      presentation: l.presentation,
      packaging: l.packaging,
    })),
  });
  const buffer = await renderToBuffer(
    doc as unknown as Parameters<typeof renderToBuffer>[0],
  );

  const filename = `formato-${detail.code.toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
