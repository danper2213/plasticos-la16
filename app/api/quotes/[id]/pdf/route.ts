import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/utils/supabase/server";
import { fetchQuoteDetail } from "@/app/dashboard/cotizaciones/quote-queries";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf-document";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const detail = await fetchQuoteDetail(supabase, id);
  if (!detail) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const createdAtLabel = new Date(detail.created_at).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const doc = React.createElement(QuotePdfDocument, {
    customerName: detail.customer_name,
    notes: detail.notes,
    validUntil: detail.valid_until,
    createdAtLabel,
    defaultUtilityPercent: detail.default_utility_percent,
    lines: detail.lines.map((l) => ({
      product_name: l.product_name,
      presentation: l.presentation,
      quantity: l.quantity,
      unit_cost: l.unit_cost,
      list_unit_price: l.list_unit_price,
    })),
  });
  const buffer = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);

  const filename = `cotizacion-${id.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
