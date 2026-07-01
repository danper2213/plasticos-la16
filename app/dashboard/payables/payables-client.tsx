"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { matchesSearchQuery } from "@/lib/searchEngine";
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
import { PayablesCalendar } from "@/components/payables/payables-calendar";
import { PayablesSearchHero } from "@/components/payables/payables-search-hero";
import { triggerSuccess } from "@/lib/confetti";
import { toast } from "sonner";
import { DashboardSearchBar } from "@/components/layout/dashboard-search-bar";
import {
  type ActiveFilterChip,
} from "@/components/layout/dashboard-filter-chips";
import { DashboardStickySearch } from "@/components/layout/dashboard-sticky-search";
import { useDashboardSearchFocus } from "@/hooks/use-dashboard-search-focus";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
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
  const todayLabelRaw = format(today, "EEEE d 'de' MMMM", { locale: es });
  const todayLabel = todayLabelRaw.charAt(0).toUpperCase() + todayLabelRaw.slice(1);
  const pendingDueToday = localPayables.filter(
    (p) => p.status === "pending" && p.due_date && p.due_date.slice(0, 10) === todayStr
  ).length;

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
        <PayablesSearchHero
          ref={searchBarRef}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={handleSearchClear}
          onSearchSubmit={() => searchBarRef.current?.focus()}
          month={month}
          year={year}
          monthName={monthName}
          monthKey={monthKey}
          todayLabel={todayLabel}
          pendingDueToday={pendingDueToday}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          supplierFilter={supplierFilter}
          onSupplierFilterChange={setSupplierFilter}
          uniqueSuppliers={uniqueSuppliers}
          filterChips={filterChips}
          onClearAllFilters={filterChips.length > 1 ? clearAllFilters : undefined}
          hasActiveFilters={hasActiveFilters}
          isSearching={isSearching}
          filteredCount={filteredPayables.length}
          totalCount={localPayables.length}
          totalPorPagar={totalPorPagar}
          totalPagado={totalPagado}
          metaPercent={metaPercent}
          paidInMonth={paidInMonth}
          totalInMonth={totalInMonth}
          pendingInMonth={pendingInMonth}
          onNewInvoice={() => {
            setPayableToEdit(null);
            setFormOpen(true);
          }}
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
