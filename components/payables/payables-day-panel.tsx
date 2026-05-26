"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCop } from "@/lib/format";
import { getDuePriority, type DuePriority } from "@/components/payables/payable-card";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

export type DaySummary = {
  dateKey: string;
  payables: PayableWithSupplier[];
  pendingCount: number;
  paidCount: number;
  pendingTotal: number;
  paidTotal: number;
  hasOverdue: boolean;
  hasDueToday: boolean;
};

type DayFilter = "all" | "pending" | "paid";

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

function supplierInitial(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

function priorityAccent(priority: DuePriority, status: string) {
  if (status === "paid") return "from-emerald-500/80 to-emerald-600/40";
  if (priority === "overdue") return "from-destructive to-destructive/50";
  if (priority === "today") return "from-amber-500 to-amber-400/50";
  return "from-primary/80 to-primary/40";
}

function InvoiceRow({
  row,
  priority,
  onOpen,
  onEdit,
  onPay,
  onDelete,
}: {
  row: PayableWithSupplier;
  priority: DuePriority;
  onOpen: () => void;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const isPaid = row.status === "paid";

  return (
    <motion.li variants={rowVariants} layout className="group">
      <div
        className={cn(
          "relative flex items-stretch gap-0 overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300",
          "hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5",
          isPaid ? "border-emerald-500/25" : "border-border/80"
        )}
      >
        <div
          className={cn(
            "w-1 shrink-0 bg-gradient-to-b",
            priorityAccent(priority, row.status)
          )}
          aria-hidden
        />

        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 p-3.5 pr-2 text-left sm:gap-4 sm:p-4"
        >
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-inner sm:size-12",
              isPaid
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : priority === "overdue"
                  ? "bg-destructive/15 text-destructive"
                  : priority === "today"
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                    : "bg-primary/15 text-primary"
            )}
          >
            {supplierInitial(row.supplier_name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground sm:text-base">
                {row.supplier_name}
              </p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  isPaid
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : priority === "overdue"
                      ? "bg-destructive/15 text-destructive"
                      : priority === "today"
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                        : "bg-primary/10 text-primary"
                )}
              >
                {isPaid ? "Pagada" : priority === "overdue" ? "Vencida" : priority === "today" ? "Hoy" : "Pendiente"}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3 shrink-0" />
              <span className="tabular-nums">#{row.invoice_number}</span>
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-black tabular-nums text-foreground sm:text-lg">
              {formatCop(row.invoice_amount)}
            </p>
            <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:text-xs">
              Ver detalle
              <ChevronRight className="size-3" />
            </span>
          </div>
        </button>

        <div
          className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-border/50 bg-muted/30 px-1.5 py-2 sm:flex-row sm:items-center sm:gap-1 sm:px-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Editar"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
          {!isPaid && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
              aria-label="Registrar pago"
              onClick={onPay}
            >
              <CreditCard className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Eliminar"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </motion.li>
  );
}

export interface PayablesDayPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: DaySummary | null;
  todayStr: string;
  onOpenDetail: (row: PayableWithSupplier) => void;
  onEdit: (row: PayableWithSupplier) => void;
  onRegisterPayment: (row: PayableWithSupplier) => void;
  onDelete: (row: PayableWithSupplier) => void;
}

export function PayablesDayPanel({
  open,
  onOpenChange,
  summary,
  todayStr,
  onOpenDetail,
  onEdit,
  onRegisterPayment,
  onDelete,
}: PayablesDayPanelProps) {
  const [filter, setFilter] = useState<DayFilter>("all");

  React.useEffect(() => {
    if (!open) setFilter("all");
  }, [open]);

  const filtered = useMemo(() => {
    if (!summary) return [];
    if (filter === "pending") return summary.payables.filter((p) => p.status === "pending");
    if (filter === "paid") return summary.payables.filter((p) => p.status === "paid");
    return summary.payables;
  }, [summary, filter]);

  if (!summary) return null;

  const date = parseISO(summary.dateKey);
  const dayNum = format(date, "d");
  const weekday = format(date, "EEEE", { locale: es });
  const monthYear = format(date, "MMMM yyyy", { locale: es });
  const titleCap = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayNum} de ${monthYear}`;

  const paidPercent =
    summary.payables.length > 0
      ? Math.round((summary.paidCount / summary.payables.length) * 100)
      : 0;

  const headerTone = summary.hasOverdue
    ? "from-destructive/20 via-card to-card dark:from-destructive/25"
    : summary.hasDueToday
      ? "from-amber-500/15 via-card to-card dark:from-amber-500/20"
      : "from-primary/15 via-card to-card dark:from-blue-950/60";

  const filters: { id: DayFilter; label: string; count: number }[] = [
    { id: "all", label: "Todas", count: summary.payables.length },
    { id: "pending", label: "Pendientes", count: summary.pendingCount },
    { id: "paid", label: "Pagadas", count: summary.paidCount },
  ];

  function closeAnd(fn: () => void) {
    onOpenChange(false);
    fn();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-2xl gap-0 overflow-hidden rounded-[24px] border-border p-0 shadow-2xl sm:w-full"
        overlayClassName="bg-black/55 backdrop-blur-md"
        showCloseButton
      >
        <DialogTitle className="sr-only">Facturas del {titleCap}</DialogTitle>
        <DialogDescription className="sr-only">
          {summary.payables.length} facturas con vencimiento este día
        </DialogDescription>

        {/* Hero header */}
        <div
          className={cn(
            "relative border-b border-border/80 bg-gradient-to-br px-5 pb-5 pt-6 sm:px-6 sm:pt-7",
            headerTone
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-background/80 shadow-lg ring-1 ring-border/60 backdrop-blur sm:size-[4.5rem]">
              <span className="text-3xl font-black tabular-nums leading-none text-foreground sm:text-4xl">
                {dayNum}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {format(date, "MMM", { locale: es })}
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-base font-black tracking-tight text-foreground sm:text-lg">
                {titleCap}
              </p>
              {(summary.hasOverdue || summary.hasDueToday) && (
                <p
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                    summary.hasOverdue
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  )}
                >
                  {summary.hasOverdue ? (
                    <>
                      <AlertTriangle className="size-3.5" />
                      Hay facturas vencidas
                    </>
                  ) : (
                    <>
                      <Clock className="size-3.5" />
                      Vencimiento hoy
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* KPI pills */}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Wallet className="size-3 text-amber-600 dark:text-amber-400" />
                Por pagar
              </p>
              <p className="mt-0.5 text-sm font-black tabular-nums text-amber-700 dark:text-amber-400 sm:text-base">
                {formatCop(summary.pendingTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                Pagado
              </p>
              <p className="mt-0.5 text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-base">
                {formatCop(summary.paidTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="size-3 text-primary" />
                Facturas
              </p>
              <p className="mt-0.5 text-sm font-black tabular-nums text-foreground sm:text-base">
                {summary.payables.length}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Progreso del día</span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{paidPercent}% pagadas</span>
            </div>
            <Progress
              value={summary.paidCount}
              max={summary.payables.length || 1}
              className="h-1.5 bg-muted/80 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 border-b border-border/80 bg-muted/30 px-4 py-3 sm:px-5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all sm:text-sm",
                filter === f.id
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  filter === f.id ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5 max-h-[min(50vh,420px)]">
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                No hay facturas en esta categoría.
              </motion.p>
            ) : (
              <motion.ul
                key={filter}
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2.5 sm:space-y-3"
              >
                {filtered.map((row) => (
                  <InvoiceRow
                    key={row.id}
                    row={row}
                    priority={getDuePriority(row, todayStr)}
                    onOpen={() => closeAnd(() => onOpenDetail(row))}
                    onEdit={() => closeAnd(() => onEdit(row))}
                    onPay={() => closeAnd(() => onRegisterPayment(row))}
                    onDelete={() => closeAnd(() => onDelete(row))}
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
