"use client";

import * as React from "react";
import {
  CreditCard,
  StickyNote,
  Calendar,
  Building2,
  Eye,
  Copy,
  Check,
  CheckCircle2,
  Printer,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCop } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getPaymentsByPayable } from "@/app/dashboard/payables/actions";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/** Formatea fecha sin cambio de día por timezone: usa solo YYYY-MM-DD. */
function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = value.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  try {
    return new Date(value).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function CopyableField({
  label,
  value,
  className,
  valueMono,
}: {
  label: string;
  value: string;
  className?: string;
  valueMono?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const text = value || "—";
  const handleCopy = React.useCallback(() => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        toast.success("Copiado al portapapeles");
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("No se pudo copiar")
    );
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "group flex flex-col items-start gap-0.5 text-left transition-colors rounded-lg p-2 -m-2 hover:bg-muted/60",
        className
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium text-foreground flex items-center gap-2",
          valueMono && "font-mono tabular-nums"
        )}
      >
        {text}
        {text !== "—" && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </span>
        )}
      </span>
    </button>
  );
}

interface PayableDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: PayableWithSupplier | null;
  onEdit: () => void;
  onRegisterPayment: () => void;
  onPrintComprobante?: () => void;
}

export function PayableDetailModal({
  open,
  onOpenChange,
  payable,
  onEdit,
  onRegisterPayment,
  onPrintComprobante,
}: PayableDetailModalProps) {
  const [payments, setPayments] = React.useState<
    Awaited<ReturnType<typeof getPaymentsByPayable>>
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!payable?.id) return;
    setLoading(true);
    getPaymentsByPayable(payable.id).then((data) => {
      setPayments(data);
      setLoading(false);
    });
  }, [payable?.id]);

  if (!payable) return null;

  const hasNote = !!payable.payment_note?.trim();
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
        className="max-w-2xl w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">
          Detalle de factura {payable.invoice_number}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {payable.supplier_name} — {formatCop(payable.invoice_amount)}
        </DialogDescription>

        <motion.div
          key={payable.id}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={modalSpring}
          className="flex flex-col"
        >
          {/* Hero header — pr-20 deja espacio para el botón cerrar (X) */}
          <motion.div
            variants={staggerItem}
            className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-6 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                  {payable.supplier_name}
                </h2>
                <span className="inline-flex mt-2 items-center rounded-lg bg-muted px-3 py-1 text-xs font-semibold tabular-nums text-muted-foreground border border-border dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/50">
                  #{payable.invoice_number}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold shadow-lg",
                  payable.status === "paid"
                    ? "bg-primary/20 text-primary ring-1 ring-primary/40 dark:bg-blue-500/20 dark:text-blue-400 dark:ring-blue-500/40"
                    : "bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/40 dark:text-amber-400 dark:ring-amber-500/40"
                )}
              >
                {payable.status === "paid" ? "Pagada" : "Pendiente"}
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="p-6 space-y-6 overflow-y-auto max-h-[60vh] flex flex-col"
          >
            {/* Info grid: Monto & Vencimiento | Bank card | Notas */}
            <motion.div
              variants={staggerItem}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Monto & Vencimiento */}
              <div className="rounded-2xl border border-border bg-muted/50 p-5 text-center lg:col-span-1 min-w-0 overflow-visible dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-xl sm:text-2xl font-black tabular-nums text-foreground whitespace-nowrap">
                  {formatCop(payable.invoice_amount)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">
                  Monto
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Calendar className="size-4 shrink-0" />
                  <span>Vence: {formatDate(payable.due_date)}</span>
                </div>
              </div>

              {/* Datos Bancarios — virtual card */}
              <div className="rounded-2xl border border-border bg-muted/50 p-5 lg:col-span-1 flex flex-col justify-center gap-1 dark:border-zinc-700/80 dark:bg-gradient-to-br dark:from-zinc-900/90 dark:to-zinc-950">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Building2 className="size-3.5" />
                  Datos bancarios
                </p>
                <CopyableField label="Banco / Cuenta / Número" value={bankLine} valueMono />
                {convenio && (
                  <CopyableField label="Convenio" value={convenio} className="mt-1" />
                )}
                <p className="text-[10px] text-muted-foreground/80 mt-2">Click para copiar</p>
              </div>

              {/* Notas — post-it */}
              <div className="lg:col-span-1">
                {hasNote ? (
                  <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 shadow-lg flex items-start gap-3 dark:border-amber-700/50 dark:bg-amber-950/40 dark:shadow-amber-950/30">
                    <StickyNote className="size-5 shrink-0 text-amber-600 mt-0.5 dark:text-amber-500/90" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                        Nota de pago
                      </p>
                      <p className="text-sm text-amber-900/95 dark:text-amber-100/95">{payable.payment_note}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-center">
                    <StickyNote className="size-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Sin notas especiales</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Payment history — timeline */}
            <motion.div variants={staggerItem}>
              <p className="text-sm font-semibold text-foreground mb-3">
                Historial de pagos
              </p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-border bg-muted/50 p-4">
                  No hay pagos registrados para esta factura.
                </p>
              ) : (
                <ul className="rounded-xl overflow-hidden">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-4 py-3 px-3 rounded-lg transition-colors hover:bg-muted/60"
                    >
                      <CheckCircle2 className="size-5 text-primary shrink-0" aria-hidden />
                      <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(p.payment_date)}
                        </span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCop(p.amount_paid)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {p.source_of_funds}
                        </span>
                      </div>
                      {p.receipt_url && (
                        <a
                          href={p.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                        >
                          <Eye className="size-3" />
                          Comprobante
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            <motion.div variants={staggerItem} className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={onEdit}
                className="flex-1 min-w-[140px] gap-2 h-11 text-base border-border hover:bg-muted"
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              {payable.status === "pending" && (
                <Button
                  onClick={onRegisterPayment}
                  className="flex-1 min-w-[140px] gap-2 h-11 text-base"
                >
                  <CreditCard className="size-4" />
                  Registrar Pago
                </Button>
              )}
              {onPrintComprobante && (
                <Button
                  variant="outline"
                  onClick={onPrintComprobante}
                  className="flex-1 min-w-[140px] gap-2 h-11 text-base border-border hover:bg-muted"
                >
                  <Printer className="size-4" />
                  Generar comprobante
                </Button>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
