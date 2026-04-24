"use client";

import Link from "next/link";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";

interface ProductLabelClientProps {
  productName: string;
  scanCode: string;
}

export function ProductLabelClient({ productName, scanCode }: ProductLabelClientProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-8 print:max-w-none print:py-4">
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Imprimir etiqueta
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/products">Volver a productos</Link>
        </Button>
      </div>

      <div
        className="flex flex-col items-center rounded-2xl border-2 border-border bg-white p-8 text-zinc-900 shadow-sm print:border-2 print:shadow-none"
        data-print-label
      >
        <QRCode value={scanCode} size={220} level="M" />
        <p className="mt-6 max-w-full text-center text-base font-black leading-snug">{productName}</p>
        <p className="mt-2 font-mono text-sm tracking-wide text-zinc-600">{scanCode}</p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">
        Usá recorte al imprimir si la etiqueta es más pequeña que la hoja.
      </p>
    </div>
  );
}
