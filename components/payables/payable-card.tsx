"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Trash2,
  Calendar,
  Building2,
  Pencil,
  AlertTriangle,
  Clock,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

export type DuePriority = "overdue" | "today" | "ok";

export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return <Badge variant="success">Pagada</Badge>;
  }
  return <Badge variant="warning">Pendiente</Badge>;
}

export function getDuePriority(
  row: PayableWithSupplier,
  todayStr: string
): DuePriority {
  if (row.status !== "pending" || !row.due_date) return "ok";
  const dueStr = row.due_date.slice(0, 10);
  if (dueStr < todayStr) return "overdue";
  if (dueStr === todayStr) return "today";
  return "ok";
}

export function PayableCard({
  row,
  priority,
  onOpenDetail,
  onCardClick,
  onPointerDown,
  onEdit,
  onRegisterPayment,
  onDelete,
  formatDate,
  formatCop,
  compact = false,
}: {
  row: PayableWithSupplier;
  priority: DuePriority;
  onOpenDetail: (row: PayableWithSupplier) => void;
  onCardClick: (e: React.MouseEvent, row: PayableWithSupplier) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onRegisterPayment: () => void;
  onDelete: () => void;
  formatDate: (value: string | null) => string;
  formatCop: (n: number) => string;
  compact?: boolean;
}) {
  const priorityStyles =
    priority === "overdue"
      ? "border-2 border-destructive/60 bg-destructive/5 dark:bg-destructive/10"
      : priority === "today"
        ? "border-2 border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
        : "border-2 border-border";

  const priorityLabel =
    priority === "overdue" ? (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive dark:bg-destructive/20 dark:text-destructive">
        <AlertTriangle className="size-3.5" />
        Vencida
      </span>
    ) : priority === "today" ? (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/20 dark:text-amber-400">
        <Clock className="size-3.5" />
        Vence hoy
      </span>
    ) : null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => onCardClick(e, row)}
        onPointerDown={onPointerDown}
        className={cn(
          "w-full text-left rounded-lg border px-2.5 py-2 transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          row.status === "paid"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : priority === "overdue"
              ? "border-destructive/40 bg-destructive/5"
              : priority === "today"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border/80 bg-card"
        )}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate text-foreground">
              {row.supplier_name}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              #{row.invoice_number}
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums shrink-0",
              row.status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
            )}
          >
            {formatCop(row.invoice_amount)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {row.status === "paid" ? (
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          ) : priority === "overdue" ? (
            <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
          ) : priority === "today" ? (
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
          ) : (
            <span className="size-1.5 rounded-full bg-primary/60" aria-hidden />
          )}
          <span className="text-[10px] text-muted-foreground capitalize">
            {row.status === "paid" ? "Pagada" : "Pendiente"}
          </span>
        </div>
      </button>
    );
  }

  return (
    <motion.div
      layout
      variants={cardVariants}
      whileHover={{ zIndex: 50, y: -4 }}
      className={cn(
        "relative min-w-0 rounded-xl bg-card shadow-md overflow-hidden flex flex-col cursor-pointer transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40",
        priorityStyles
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => onCardClick(e, row)}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => e.key === "Enter" && onOpenDetail(row)}
        className="flex-1 flex flex-col min-h-0"
        aria-label={`Ver detalle de factura ${row.invoice_number}`}
      >
        <header className="relative flex flex-row items-start justify-between gap-2 p-3 pr-16 border-b border-border/80 bg-muted/40">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted-foreground truncate flex items-center gap-1.5">
              <Building2 className="size-3.5 shrink-0 text-primary/80" />
              {row.supplier_name}
            </p>
            <p className="text-xs font-medium tabular-nums text-muted-foreground/90 mt-0.5 flex items-center gap-1">
              <FileText className="size-3 shrink-0" />
              #{row.invoice_number}
            </p>
          </div>
          <div className="absolute top-2.5 right-2.5">
            <StatusBadge status={row.status} />
          </div>
        </header>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-2xl font-black tabular-nums text-foreground text-center leading-tight">
            {formatCop(row.invoice_amount)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Vence: {formatDate(row.due_date)}
            </span>
            {priorityLabel}
          </div>
          {row.payment_note?.trim() ? (
            <p
              className="text-xs text-muted-foreground border-t border-border/60 pt-2 mt-0.5 line-clamp-2"
              title={row.payment_note.trim()}
            >
              <span className="font-semibold text-foreground/80">Nota:</span>{" "}
              {row.payment_note.trim()}
            </p>
          ) : null}
        </div>
      </div>

      <footer
        className="border-t border-border/80 p-2 flex flex-wrap items-center justify-end gap-1.5 bg-muted/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Editar
        </Button>
        {row.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-8 text-xs"
            onClick={onRegisterPayment}
          >
            <CreditCard className="size-3.5" />
            Registrar Pago
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label="Eliminar factura"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </footer>
    </motion.div>
  );
}
