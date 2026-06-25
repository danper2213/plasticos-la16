"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { matchesSearchQuery } from "@/lib/searchEngine";
import {
  Calendar,
  Plus,
  Wallet,
  CheckCircle2,
  Target,
  FileText,
} from "lucide-react";
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
import { MonthPaginator } from "@/components/payables/month-paginator";
import { PayablesCalendar } from "@/components/payables/payables-calendar";
import { Progress } from "@/components/ui/progress";
import { formatCop } from "@/lib/format";
import { triggerSuccess } from "@/lib/confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { DashboardSearchBar } from "@/components/layout/dashboard-search-bar";
import { DashboardSearchHero } from "@/components/layout/dashboard-search-hero";
import {
  DashboardFilterChips,
  type ActiveFilterChip,
} from "@/components/layout/dashboard-filter-chips";
import { DashboardStickySearch } from "@/components/layout/dashboard-sticky-search";
import { useDashboardSearchFocus } from "@/hooks/use-dashboard-search-focus";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import type { PayableWithSupplier, BankAccountOption } from "./actions";
import type { ActiveSupplierOption } from "./actions";

type QuickFilter = "all" | "pending" | "under3m";
const UNDER_3M = 3_000_000;

interface PayablesClientProps {
  payables: PayableWithSupplier[];
  suppliers: ActiveSupplierOption[];
  bankAccounts: BankAccountOption[];
  month: number;
  year: number;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payableToDelete, setPayableToDelete] = useState<PayableWithSupplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [selectedPayableForPayment, setSelectedPayableForPayment] = useState<PayableWithSupplier | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPayableForDetail, setSelectedPayableForDetail] = useState<PayableWithSupplier | null>(null);
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [payableForComprobante, setPayableForComprobante] = useState<PayableWithSupplier | null>(null);
  const mouseDownRef = React.useRef<{ x: number; y: number } | null>(null);
  const [localPayables, setLocalPayables] = useState(payables);
  const {
    heroObservedRef,
    searchBarRef,
    stickySearchBarRef,
    heroVisible,
  } = useDashboardSearchFocus();

  React.useEffect(() => {
    setLocalPayables(payables);
  }, [payables]);

  const uniqueSuppliers = useMemo(() => {
    const names = new Set(localPayables.map((p) => p.supplier_name).filter(Boolean));
    return Array.from(names).sort();
  }, [localPayables]);

  const filteredPayables = useMemo(() => {
    let result = localPayables;

    if (quickFilter === "pending") {
      result = result.filter((row) => row.status === "pending");
    } else if (quickFilter === "under3m") {
      result = result.filter((row) => (Number(row.invoice_amount) || 0) < UNDER_3M);
    }

    if (supplierFilter && supplierFilter !== "all") {
      result = result.filter((row) => row.supplier_name === supplierFilter);
    }

    if (searchQuery.trim()) {
      result = result.filter((row) =>
        matchesSearchQuery(searchQuery, row.supplier_name, row.invoice_number),
      );
    }

    return result;
  }, [localPayables, quickFilter, supplierFilter, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const hasActiveFilters =
    isSearching || quickFilter !== "all" || supplierFilter !== "all";

  const filterChips = useMemo((): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = [];

    if (isSearching) {
      chips.push({
        id: "search",
        label: `«${searchQuery.trim()}»`,
        onRemove: () => setSearchQuery(""),
      });
    }

    if (quickFilter === "pending") {
      chips.push({
        id: "pending",
        label: "Pendientes",
        onRemove: () => setQuickFilter("all"),
      });
    } else if (quickFilter === "under3m") {
      chips.push({
        id: "under3m",
        label: "Menores a $3M",
        onRemove: () => setQuickFilter("all"),
      });
    }

    if (supplierFilter !== "all") {
      chips.push({
        id: "supplier",
        label: supplierFilter,
        onRemove: () => setSupplierFilter("all"),
      });
    }

    return chips;
  }, [isSearching, searchQuery, quickFilter, supplierFilter]);

  function handleSearchClear() {
    setSearchQuery("");
  }

  function clearAllFilters() {
    handleSearchClear();
    setQuickFilter("all");
    setSupplierFilter("all");
  }

  const handleDueDateChange = React.useCallback(
    async (payableId: string, fromDateKey: string, toDateKey: string) => {
      if (fromDateKey === toDateKey) return;

      const snapshot = localPayables;
      const storageDate = `${toDateKey}T12:00:00.000Z`;
      setLocalPayables((prev) =>
        prev.map((p) => (p.id === payableId ? { ...p, due_date: storageDate } : p))
      );

      const { updatePayableDueDate } = await import("./actions");
      const result = await updatePayableDueDate(payableId, toDateKey);

      if (result.success) {
        const targetMonth = Number(toDateKey.slice(5, 7));
        const targetYear = Number(toDateKey.slice(0, 4));
        if (targetMonth !== month || targetYear !== year) {
          toast.success(`Vencimiento movido al ${formatDateOnlyEsCO(toDateKey)}`, {
            description: "La factura quedó en otro mes. Usa el paginador para verla.",
          });
        } else {
          toast.success(`Vencimiento movido al ${formatDateOnlyEsCO(toDateKey)}`);
        }
        router.refresh();
      } else {
        setLocalPayables(snapshot);
        toast.error(result.error ?? "No se pudo cambiar la fecha de vencimiento");
      }
    },
    [localPayables, month, year, router]
  );

  function handleFormSuccess() {
    router.refresh();
  }

  function openPaymentModal(payable: PayableWithSupplier) {
    setSelectedPayableForPayment(payable);
    setPaymentModalOpen(true);
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

  const totalInMonth = localPayables.length;
  const pendingInMonth = localPayables.filter((p) => p.status === "pending").length;
  const paidInMonth = localPayables.filter((p) => p.status === "paid").length;
  const totalPorPagar = localPayables
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (Number(p.invoice_amount) || 0), 0);
  const totalPagado = localPayables
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
  const pendingDueToday = localPayables.filter(
    (p) => p.status === "pending" && p.due_date && p.due_date.slice(0, 10) === todayStr
  ).length;

  const titleSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

  const calendarHandlers = {
    onOpenDetail: openDetailModal,
    onCardClick: handleCardClick,
    onPointerDown: handleCardPointerDown,
    onEdit: (row: PayableWithSupplier) => {
      setPayableToEdit(row);
      setFormOpen(true);
    },
    onRegisterPayment: openPaymentModal,
    onDelete: openDeleteDialog,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4 text-primary/80" />
          Hoy es{" "}
          <strong className="font-semibold text-slate-800 dark:text-zinc-100">
            {todayLabelCapitalized}
          </strong>
        </span>
        <span className="text-sm text-muted-foreground">
          · Hoy vencen{" "}
          <strong className="font-semibold text-slate-800 dark:text-zinc-100">
            {pendingDueToday}
          </strong>{" "}
          factura
          {pendingDueToday !== 1 ? "s" : ""}
        </span>
      </div>

      <DashboardPageHeader
        icon={Wallet}
        title={
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-zinc-50 sm:text-4xl">
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
        }
        actions={
          <>
            <Suspense fallback={<div className="h-11 w-44 animate-pulse rounded-xl bg-muted" />}>
              <MonthPaginator />
            </Suspense>
            <Button
              onClick={() => {
                setPayableToEdit(null);
                setFormOpen(true);
              }}
              className="h-11 w-full gap-2 rounded-xl border-0 bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/25 sm:w-auto"
            >
              <Plus className="size-4" />
              Nueva Factura
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm dark:border-border">
          <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="size-3.5 text-amber-500 dark:text-amber-400/80" />
            Total por Pagar ($)
          </p>
          <p className="mt-1 text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">
            {formatCop(totalPorPagar)}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm dark:border-border">
          <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            Total Pagado ($)
          </p>
          <p className="mt-1 text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCop(totalPagado)}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm dark:border-border">
          <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            Estado de Meta
          </p>
          <div className="mt-1 flex items-center gap-2">
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
        <div className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm dark:border-border">
          <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="size-3.5 text-muted-foreground" />
            Resumen Cantidad
          </p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-foreground">
            {totalInMonth} Registradas / {pendingInMonth} Pendientes
          </p>
        </div>
      </div>

      <DashboardStickySearch visible={!heroVisible}>
        <DashboardSearchBar
          ref={stickySearchBarRef}
          variant="sticky"
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleSearchClear}
          onSubmit={() => stickySearchBarRef.current?.focus()}
          placeholder="Buscar: factura, proveedor…"
          ariaLabel="Buscar factura o proveedor"
        />
      </DashboardStickySearch>

      <div ref={heroObservedRef}>
        <DashboardSearchHero
          ref={searchBarRef}
          icon={Wallet}
          title="¿Qué factura buscas?"
          description={
            <>
              Proveedor o número de factura — por ejemplo{" "}
              <span className="font-medium text-foreground/80">FE-1234</span>
            </>
          }
          ariaLabel="Búsqueda de cuentas por pagar"
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={handleSearchClear}
          onSearchSubmit={() => searchBarRef.current?.focus()}
          placeholder="Buscar: factura, proveedor…"
          searchAriaLabel="Buscar factura o proveedor"
          status={
            <p className="tabular-nums">
              {hasActiveFilters ? (
                <>
                  {filteredPayables.length} resultado
                  {filteredPayables.length === 1 ? "" : "s"} en{" "}
                  {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es })}
                </>
              ) : (
                <>
                  {localPayables.length} factura
                  {localPayables.length === 1 ? "" : "s"} en{" "}
                  {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es })}
                </>
              )}
            </p>
          }
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3 dark:bg-muted/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Filtrar
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={quickFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 rounded-lg px-3 text-xs",
                  quickFilter === "all" &&
                    "bg-primary/15 text-primary ring-1 ring-primary/30",
                )}
                onClick={() => setQuickFilter("all")}
              >
                Todos
              </Button>
              <Button
                variant={quickFilter === "pending" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 rounded-lg px-3 text-xs",
                  quickFilter === "pending" &&
                    "bg-primary/15 text-primary ring-1 ring-primary/30",
                )}
                onClick={() => setQuickFilter("pending")}
              >
                Pendientes
              </Button>
              <Button
                variant={quickFilter === "under3m" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 rounded-lg px-3 text-xs",
                  quickFilter === "under3m" &&
                    "bg-primary/15 text-primary ring-1 ring-primary/30",
                )}
                onClick={() => setQuickFilter(quickFilter === "under3m" ? "all" : "under3m")}
              >
                Menores a $3M
              </Button>
            </div>
          </div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="h-9 w-full rounded-lg border-border/70 bg-background/80 sm:w-[220px]">
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
        <DashboardFilterChips
          chips={filterChips}
          onClearAll={filterChips.length > 1 ? clearAllFilters : undefined}
        />
      </div>

      {filteredPayables.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground"
        >
          {localPayables.length === 0
            ? "No hay facturas registradas para este mes."
            : "Ningún resultado coincide con la búsqueda."}
        </motion.div>
      ) : (
        <PayablesCalendar
          payables={filteredPayables}
          month={month}
          year={year}
          todayStr={todayStr}
          onDueDateChange={handleDueDateChange}
          {...calendarHandlers}
        />
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

    </div>
  );
}
