"use client";

import * as React from "react";
import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCop } from "@/lib/format";
import { motion } from "framer-motion";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

/** Genera HTML completo del comprobante para abrirlo en ventana nueva e imprimir/PDF */
function buildComprobanteHtml(
  invoiceNumber: string,
  supplierName: string,
  amountFormatted: string,
  bankLine: string,
  convenio: string | null,
  referencia: string
): string {
  const convenioBlock =
    convenio && convenio !== "—"
      ? `
    <div class="conv-block">
      <p class="etq">Convenio</p>
      <p class="val">${escapeHtml(convenio)}</p>
    </div>`
      : "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Comprobante para pago - ${escapeHtml(invoiceNumber)}</title>
  <style>
    @page { size: letter; margin: 1.25cm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #18181b; background: #f4f4f5; font-size: 17px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    @media print {
      body { background: #fff; padding: 0; display: block; min-height: auto; }
      .card { box-shadow: none !important; border: 2px solid #d4d4d8 !important; }
    }
    .card { max-width: 100%; width: 100%; border-radius: 16px; border: 2px solid #e4e4e7; background: #fff; padding: 28px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .card-header { text-align: center; padding-bottom: 16px; border-bottom: 1px solid #e4e4e7; margin-bottom: 20px; }
    .card-titulo { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a; margin: 0 0 6px; }
    .card-factura { font-size: 22px; font-weight: 800; color: #18181b; margin: 0; }
    .fila { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid #f4f4f5; font-size: 17px; }
    .fila dt { margin: 0; font-weight: 600; color: #71717a; flex-shrink: 0; font-size: 16px; }
    .fila dd { margin: 0; font-weight: 500; text-align: right; word-break: break-word; font-size: 17px; }
    .fila.monto dd { font-weight: 800; color: #2563eb; font-size: 20px; }
    .bloque-bancario { margin-top: 20px; padding: 20px 24px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa; font-family: ui-monospace, monospace; }
    .bloque-bancario .etq { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin: 0 0 8px; }
    .bloque-bancario .val { font-size: 18px; font-weight: 700; color: #18181b; word-break: break-all; margin: 0; line-height: 1.4; }
    .bloque-bancario .conv-block { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4e4e7; }
    .ref { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e4e4e7; }
    .pie { font-size: 12px; color: #71717a; text-align: center; margin: 24px 0 0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <p class="card-titulo">Comprobante para pago</p>
      <p class="card-factura">Factura #${escapeHtml(invoiceNumber)}</p>
    </div>
    <dl style="margin:0;padding:0;">
      <div class="fila">
        <dt>Proveedor</dt>
        <dd>${escapeHtml(supplierName)}</dd>
      </div>
      <div class="fila monto">
        <dt>Monto a pagar</dt>
        <dd>${escapeHtml(amountFormatted)}</dd>
      </div>
    </dl>
    <div class="bloque-bancario">
      <p class="etq">Datos bancarios para transferencia</p>
      <p class="val">${escapeHtml(bankLine)}</p>
      ${convenioBlock}
    </div>
    <div class="fila ref">
      <dt>Referencia de pago</dt>
      <dd>${escapeHtml(referencia || "—")}</dd>
    </div>
    <p class="pie">Documento generado para uso en el pago de la factura. PLASTICOS LA 16.</p>
  </div>
  <script>
    window.onload = function() { window.print(); };
    window.onafterprint = function() {
      if (window.frameElement) window.frameElement.remove();
      else window.close();
    };
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const div = { innerHTML: "" };
  const el = document.createElement("div");
  el.textContent = text;
  return el.innerHTML;
}

interface PayableComprobanteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: PayableWithSupplier | null;
}

export function PayableComprobanteModal({
  open,
  onOpenChange,
  payable,
}: PayableComprobanteModalProps) {
  const [referencia, setReferencia] = React.useState("");

  React.useEffect(() => {
    if (open) setReferencia("");
  }, [open]);

  const handlePrint = React.useCallback(() => {
    if (!payable) return;
    const bankParts = [
      payable.supplier_bank_name,
      payable.supplier_account_type,
      payable.supplier_account_number?.trim(),
    ].filter(Boolean);
    const bankLine = bankParts.join(" · ") || "—";
    const convenioVal = payable.supplier_bank_agreement?.trim() || null;
    const html = buildComprobanteHtml(
      String(payable.invoice_number ?? "").trim() || "—",
      String(payable.supplier_name ?? "").trim() || "—",
      formatCop(Number(payable.invoice_amount) || 0),
      bankLine,
      convenioVal,
      referencia.trim()
    );
    const win = window.open("", "_blank", "width=800,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      // Popup bloqueado: mostrar comprobante en iframe a pantalla completa; el HTML llama a print() y al cerrar quita el iframe
      const doc = window.document;
      const frame = doc.createElement("iframe");
      frame.setAttribute("title", "Comprobante para pago");
      frame.style.position = "fixed";
      frame.style.inset = "0";
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.border = "none";
      frame.style.zIndex = "99999";
      frame.style.background = "#fff";
      doc.body.appendChild(frame);
      const w = frame.contentWindow;
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    }
  }, [payable, referencia]);

  if (!payable) return null;

  const bankParts = [
    payable.supplier_bank_name,
    payable.supplier_account_type,
    payable.supplier_account_number?.trim(),
  ].filter(Boolean);
  const bankLine = bankParts.join(" · ") || "—";
  const convenio = payable.supplier_bank_agreement?.trim() || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800 comprobante-dialog"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">Comprobante para pago</DialogTitle>
        <DialogDescription className="sr-only">
          Datos para realizar el pago de la factura {payable.invoice_number}.
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-4 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <Printer className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Comprobante para pago
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Genere el PDF con los datos necesarios para realizar el pago.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Referencia de pago (editable) — solo en pantalla */}
            <div className="space-y-2 no-print">
              <Label htmlFor="comprobante-referencia" className="text-muted-foreground">
                Referencia de pago (opcional)
              </Label>
              <Input
                id="comprobante-referencia"
                placeholder="Ej. Pago factura marzo, orden 123..."
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              />
            </div>

            {/* Vista previa del comprobante (el PDF se genera en ventana nueva) */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-5">
              <div className="text-center border-b border-border pb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Comprobante para pago
                </p>
                <p className="text-lg font-black text-foreground mt-1">
                  Factura #{String(payable.invoice_number ?? "").trim() || "—"}
                </p>
              </div>

              <dl className="grid gap-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="font-semibold text-muted-foreground shrink-0">Proveedor</dt>
                  <dd className="font-medium text-foreground text-right break-words">{String(payable.supplier_name ?? "").trim() || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="font-semibold text-muted-foreground shrink-0">Monto a pagar</dt>
                  <dd className="font-black text-foreground tabular-nums">{formatCop(Number(payable.invoice_amount) || 0)}</dd>
                </div>

                {/* Datos bancarios */}
                <div className="pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Datos bancarios para transferencia
                  </p>
                  <div className="rounded-xl border border-border bg-muted/50 p-4 font-mono text-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Banco / Tipo cuenta / Número</p>
                      <p className="text-base font-semibold text-foreground break-all leading-snug">{bankLine}</p>
                    </div>
                    {convenio && (
                      <div className="space-y-1 pt-3 mt-3 border-t border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Convenio</p>
                        <p className="text-base font-semibold text-foreground">{convenio}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <dt className="font-semibold text-muted-foreground shrink-0">Referencia de pago</dt>
                  <dd className="font-medium text-foreground text-right min-h-[1.25rem] break-words">{referencia.trim() || "—"}</dd>
                </div>
              </dl>

              <p className="text-[10px] text-muted-foreground text-center pt-2">
                Documento generado para uso en el pago de la factura. PLASTICOS LA 16.
              </p>
            </div>

            {/* Acciones — ocultas al imprimir */}
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-border hover:bg-muted"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={handlePrint}
                className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <FileDown className="size-4" />
                Generar PDF comprobante
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
