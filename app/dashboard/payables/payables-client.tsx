"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import {
  CreditCard,
  Search,
  Trash2,
  Calendar,
  Plus,
  Wallet,
  CheckCircle2,
  Target,
  FileText,
  Building2,
  Pencil,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PayableForm } from "@/components/payables/payable-form";
import { PayableDetailModal } from "@/components/payables/payable-detail-modal";
import { PayableComprobanteModal } from "@/components/payables/comprobante-modal";
import { PaymentModal } from "@/components/payables/payment-modal";
import { PaymentHistoryModal } from "@/components/payables/payment-history-modal";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { Progress } from "@/components/ui/progress";
import { formatCop } from "@/lib/format";
import { triggerSuccess } from "@/lib/confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import type { PayableWithSupplier, BankAccountOption } from "./actions";
import type { ActiveSupplierOption } from "./actions";

const listVariants = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

type QuickFilter = "all" | "pending" | "under3m";
const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Solo Pendientes" },
  { value: "under3m", label: "Menores a $3M" },
];
const UNDER_3M = 3_000_000;

interface PayablesClientProps {
  payables: PayableWithSupplier[];
  suppliers: ActiveSupplierOption[];
  bankAccounts: BankAccountOption[];
  month: number;
  year: number;
}

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

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return <Badge variant="success">Pagada</Badge>;
  }
  return <Badge variant="warning">Pendiente</Badge>;
}

type DuePriority = "overdue" | "today" | "ok";

function PayableCard({
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
            <p className="text-xs text-muted-foreground border-t border-border/60 pt-2 mt-0.5 line-clamp-2" title={row.payment_note.trim()}>
              <span className="font-semibold text-foreground/80">Nota:</span> {row.payment_note.trim()}
            </p>
          ) : null}
        </div>
      </div>

      <footer
        className="border-t border-border/80 p-2 flex flex-wrap items-center justify-end gap-1.5 bg-muted/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-8 text-xs"
          onClick={onEdit}
        >
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

export function PayablesClient({
  payables,
  suppliers,
  bankAccounts,
  month,
  year,
}: PayablesClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [payableToEdit, setPayableToEdit] = useState<PayableWithSupplier | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payableToDelete, setPayableToDelete] = useState<PayableWithSupplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [selectedPayableForPayment, setSelectedPayableForPayment] = useState<PayableWithSupplier | null>(null);
  const [selectedPayableForHistory, setSelectedPayableForHistory] = useState<PayableWithSupplier | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPayableForDetail, setSelectedPayableForDetail] = useState<PayableWithSupplier | null>(null);
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [payableForComprobante, setPayableForComprobante] = useState<PayableWithSupplier | null>(null);
  const mouseDownRef = React.useRef<{ x: number; y: number } | null>(null);

  const uniqueSuppliers = useMemo(() => {
    const names = new Set(payables.map((p) => p.supplier_name).filter(Boolean));
    return Array.from(names).sort();
  }, [payables]);

  const filteredPayables = useMemo(() => {
    let result = payables;

    if (quickFilter === "pending") {
      result = result.filter((row) => row.status === "pending");
    } else if (quickFilter === "under3m") {
      result = result.filter((row) => (Number(row.invoice_amount) || 0) < UNDER_3M);
    }

    if (supplierFilter && supplierFilter !== "all") {
      result = result.filter((row) => row.supplier_name === supplierFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (row) =>
          row.supplier_name.toLowerCase().includes(q) ||
          row.invoice_number.toLowerCase().includes(q)
      );
    }

    return result;
  }, [payables, quickFilter, supplierFilter, searchQuery]);

  const { pendingPayables, paidPayables } = useMemo(() => {
    const pending = filteredPayables
      .filter((p) => p.status === "pending")
      .sort((a, b) => {
        const da = (a.due_date ?? "").slice(0, 10);
        const db = (b.due_date ?? "").slice(0, 10);
        return da.localeCompare(db);
      });
    const paid = filteredPayables
      .filter((p) => p.status === "paid")
      .sort((a, b) => {
        const da = (b.updated_at ?? b.due_date ?? "").slice(0, 10);
        const db = (a.updated_at ?? a.due_date ?? "").slice(0, 10);
        return da.localeCompare(db);
      });
    return { pendingPayables: pending, paidPayables: paid };
  }, [filteredPayables]);

  function getDuePriority(row: PayableWithSupplier): "overdue" | "today" | "ok" {
    if (row.status !== "pending" || !row.due_date) return "ok";
    const dueStr = row.due_date.slice(0, 10);
    if (dueStr < todayStr) return "overdue";
    if (dueStr === todayStr) return "today";
    return "ok";
  }

  function handleFormSuccess() {
    router.refresh();
  }

  function openPaymentModal(payable: PayableWithSupplier) {
    setSelectedPayableForPayment(payable);
    setPaymentModalOpen(true);
  }

  function openHistoryModal(payable: PayableWithSupplier) {
    setSelectedPayableForHistory(payable);
    setHistoryModalOpen(true);
  }

  function openDeleteDialog(payable: PayableWithSupplier) {
    setPayableToDelete(payable);
    setDeleteDialogOpen(true);
  }

  function openDetailModal(payable: PayableWithSupplier) {
    setSelectedPayableForDetail(payable);
    setDetailModalOpen(true);
  }

  function handleCardPointerDown(e: React.PointerEvent) {
    mouseDownRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleCardClick(e: React.MouseEvent, row: PayableWithSupplier) {
    const down = mouseDownRef.current;
    mouseDownRef.current = null;
    if (!down) return;
    const delta = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    if (delta <= 8) openDetailModal(row);
  }

  async function confirmDelete() {
    if (!payableToDelete) return;
    setIsDeleting(true);
    const { deleteInvoice } = await import("./actions");
    const result = await deleteInvoice(payableToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setPayableToDelete(null);
    if (result.success) {
      triggerSuccess();
      toast.success("🎉 ¡Excelente! La factura fue eliminada correctamente");
      router.refresh();
    } else {
      toast.error(result.error ?? "Hubo un error al eliminar la factura");
    }
  }

  const totalInMonth = payables.length;
  const pendingInMonth = payables.filter((p) => p.status === "pending").length;
  const paidInMonth = payables.filter((p) => p.status === "paid").length;
  const totalPorPagar = payables
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (Number(p.invoice_amount) || 0), 0);
  const totalPagado = payables
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (Number(p.invoice_amount) || 0), 0);
  const metaPercent = totalInMonth > 0 ? Math.round((paidInMonth / totalInMonth) * 100) : 0;

  const monthDate = new Date(year, month - 1, 1);
  const rawMonthName = format(monthDate, "LLLL", { locale: es });
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);
  const monthKey = `${year}-${month}`;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const todayLabel = format(today, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const todayLabelCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);
  const pendingDueToday = payables.filter(
    (p) => p.status === "pending" && p.due_date && p.due_date.slice(0, 10) === todayStr
  ).length;

  const titleSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <div className="pt-8 px-4 md:px-8">
      {/* Recordatorio: día actual + facturas por pagar hoy + facturas pendientes del mes */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="size-4 text-primary/80" />
          Hoy es <strong className="text-foreground">{todayLabelCapitalized}</strong>
        </span>
        <span className="text-sm text-muted-foreground">
          · Hoy vencen <strong className="text-foreground">{pendingDueToday}</strong> factura{pendingDueToday !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Header: en móvil columna (título arriba, acciones abajo); en desktop fila */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:justify-between md:items-start">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Cuentas por Pagar de{" "}
          <span className="inline-block min-w-[4ch]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={monthKey}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={titleSpring}
                className="text-primary underline decoration-primary/30 underline-offset-8"
              >
                {monthName}
              </motion.span>
            </AnimatePresence>
          </span>{" "}
          {year}
        </h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <Suspense fallback={<div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />}>
            <MonthPaginator />
          </Suspense>
          <Button
            onClick={() => {
              setPayableToEdit(null);
              setFormOpen(true);
            }}
            className="h-10 gap-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20 w-full sm:w-auto"
          >
            <Plus className="size-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Dashboard KPI cards — left-aligned with title */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
            <Wallet className="size-3.5 text-amber-500 dark:text-amber-400/80" />
            Total por Pagar ($)
          </p>
          <p className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCop(totalPorPagar)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            Total Pagado ($)
          </p>
          <p className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCop(totalPagado)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
            <Target className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            Estado de Meta
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Progress
              value={paidInMonth}
              max={totalInMonth || 1}
              className="h-2 flex-1 bg-muted [&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-500"
            />
            <span className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400 w-10 text-right">
              {metaPercent}%
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
            <FileText className="size-3.5 text-muted-foreground" />
            Resumen Cantidad
          </p>
          <p className="text-xl font-black tabular-nums text-foreground mt-0.5">
            {totalInMonth} Registradas / {pendingInMonth} Pendientes
          </p>
        </div>
      </div>

      {/* Action bar — search & filters, left-aligned */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border mb-6">
        <div className="relative flex-1 w-full min-w-[200px]">
          <div className="rounded-lg bg-background border-2 border-input shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <Input
              placeholder="Buscar factura o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-11 pr-4 text-base w-full rounded-lg border-0 bg-transparent focus-visible:ring-0"
              aria-label="Buscar factura o proveedor"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={quickFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-9 rounded-lg",
              quickFilter === "all" && "bg-primary/15 text-primary ring-1 ring-primary/30"
            )}
            onClick={() => setQuickFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={quickFilter === "pending" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-9 rounded-lg",
              quickFilter === "pending" && "bg-primary/15 text-primary ring-1 ring-primary/30"
            )}
            onClick={() => setQuickFilter("pending")}
          >
            Pendientes
          </Button>
          <Button
            variant={quickFilter === "under3m" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-9 rounded-lg",
              quickFilter === "under3m" && "bg-primary/15 text-primary ring-1 ring-primary/30"
            )}
            onClick={() => setQuickFilter(quickFilter === "under3m" ? "all" : "under3m")}
          >
            Menores a $3M
          </Button>
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-full rounded-lg border-input bg-background md:w-[220px] h-10 focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {uniqueSuppliers.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPayables.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground"
        >
          {payables.length === 0
            ? "No hay facturas registradas para este mes."
            : "Ningún resultado coincide con la búsqueda."}
        </motion.div>
      ) : (
        <div className="overflow-visible space-y-8 pt-6 pb-8">
          <AnimatePresence mode="wait">
            {pendingPayables.length > 0 && (
              <motion.section
                key="section-pending"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-amber-500 dark:text-amber-400" />
                  <h2 className="text-lg font-bold text-foreground">
                    Pendientes
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({pendingPayables.length})
                    </span>
                  </h2>
                </div>
                <motion.div
                  key={`pending-${month}-${year}-${searchQuery}-${quickFilter}-${supplierFilter}`}
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch"
                >
                  {pendingPayables.map((row) => {
                    const priority = getDuePriority(row);
                    return (
                      <PayableCard
                        key={row.id}
                        row={row}
                        priority={priority}
                        onOpenDetail={openDetailModal}
                        onCardClick={handleCardClick}
                        onPointerDown={handleCardPointerDown}
                        onEdit={(e) => {
                          e.stopPropagation();
                          setPayableToEdit(row);
                          setFormOpen(true);
                        }}
                        onRegisterPayment={() => openPaymentModal(row)}
                        onDelete={() => openDeleteDialog(row)}
                        formatDate={formatDate}
                        formatCop={formatCop}
                      />
                    );
                  })}
                </motion.div>
              </motion.section>
            )}

            {paidPayables.length > 0 && (
              <motion.section
                key="section-paid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500 dark:text-emerald-400" />
                  <h2 className="text-lg font-bold text-foreground">
                    Pagadas
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({paidPayables.length})
                    </span>
                  </h2>
                </div>
                <motion.div
                  key={`paid-${month}-${year}-${searchQuery}-${quickFilter}-${supplierFilter}`}
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch"
                >
                  {paidPayables.map((row) => (
                    <PayableCard
                      key={row.id}
                      row={row}
                      priority="ok"
                      onOpenDetail={openDetailModal}
                      onCardClick={handleCardClick}
                      onPointerDown={handleCardPointerDown}
                      onEdit={(e) => {
                        e.stopPropagation();
                        setPayableToEdit(row);
                        setFormOpen(true);
                      }}
                      onRegisterPayment={() => openPaymentModal(row)}
                      onDelete={() => openDeleteDialog(row)}
                      formatDate={formatDate}
                      formatCop={formatCop}
                    />
                  ))}
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      )}

      <PayableDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        payable={selectedPayableForDetail}
        onEdit={() => {
          if (!selectedPayableForDetail) return;
          setPayableToEdit(selectedPayableForDetail);
          setDetailModalOpen(false);
          setFormOpen(true);
        }}
        onRegisterPayment={() => {
          if (!selectedPayableForDetail) return;
          setSelectedPayableForPayment(selectedPayableForDetail);
          setDetailModalOpen(false);
          setPaymentModalOpen(true);
        }}
        onPrintComprobante={
          selectedPayableForDetail
            ? () => {
                setPayableForComprobante(selectedPayableForDetail);
                setComprobanteModalOpen(true);
              }
            : undefined
        }
      />

      <PayableComprobanteModal
        open={comprobanteModalOpen}
        onOpenChange={setComprobanteModalOpen}
        payable={payableForComprobante}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar esta factura? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PayableForm
        open={formOpen}
        onOpenChange={setFormOpen}
        suppliers={suppliers}
        onSuccess={handleFormSuccess}
        payable={payableToEdit}
      />

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        payable={selectedPayableForPayment}
        bankAccounts={bankAccounts}
        onSuccess={handleFormSuccess}
      />

      <PaymentHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        payableId={selectedPayableForHistory?.id ?? null}
        invoice_number={selectedPayableForHistory?.invoice_number ?? ""}
        supplier_name={selectedPayableForHistory?.supplier_name ?? ""}
      />
    </div>
  );
}
