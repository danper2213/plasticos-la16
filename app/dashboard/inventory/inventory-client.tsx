"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MovementForm } from "@/components/inventory/movement-form";
import { InventoryMovementHero } from "@/components/inventory/inventory-movement-hero";
import type { InventoryMovementPreset } from "@/components/inventory/inventory-movement-hero";
import { InventoryBatchCard } from "@/components/inventory/inventory-batch-card";
import { InventoryBatchDetailModal } from "@/components/inventory/inventory-batch-detail-modal";
import { InventoryProductFilterDialog } from "@/components/inventory/inventory-product-filter-dialog";
import { InventoryDateFilterDialog } from "@/components/inventory/inventory-date-filter-dialog";
import {
  InventoryPanel,
  InventorySectionHeader,
} from "@/components/inventory/inventory-ui";
import { triggerSuccess } from "@/lib/confetti";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Package,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatMovementQuantityLabel } from "@/lib/inventory-stock-display";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";
import {
  formatDateOnlyEsCO,
  formatTimeEsCO,
  normalizeIntlOutput,
  todayDateColombia,
} from "@/lib/calendar-date";
import type { InventoryBatchWithLines, MovementWithProduct } from "./actions";
import { deleteInventoryBatch, deleteMovement, searchProductsForMovement } from "./actions";
import type { ProductSearchHit } from "./actions";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useNavigationGuardRegistration } from "@/components/layout/navigation-guard";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

function formatDateShort(value: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (isToday) {
      return `Hoy ${formatTimeEsCO(d)}`;
    }
    return normalizeIntlOutput(
      d.toLocaleDateString("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "America/Bogota",
      }),
    );
  } catch {
    return value;
  }
}

function MovementRowNequi({
  row,
  onDelete,
  compactMeta = false,
}: {
  row: MovementWithProduct;
  onDelete: () => void;
  compactMeta?: boolean;
}) {
  const type = row.movement_type;
  const isIn = type === "in";
  const isOut = type === "out";

  const iconWrap =
    isIn
      ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
      : isOut
        ? "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400"
        : "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3 shadow-sm backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-md sm:gap-4 sm:p-4 dark:bg-zinc-950/30">
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconWrap}`}
      >
        {isIn ? (
          <ArrowDownLeft className="size-6" />
        ) : isOut ? (
          <ArrowUpRight className="size-6" />
        ) : (
          <RefreshCw className="size-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground truncate">{row.product_name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {row.product_packaging?.trim() ||
            (MOVEMENT_TYPE_LABELS[type] ?? type)}
        </p>
        {!compactMeta ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateShort(row.movement_date)}
            {row.created_by_email ? ` · ${row.created_by_email}` : ""}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <p className="text-xl font-bold tabular-nums text-foreground">
          {row.movement_type === "out" ? "−" : row.movement_type === "in" ? "+" : ""}
          {formatMovementQuantityLabel(row.quantity, row.product_packaging)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        title="Eliminar"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function formatDate(value: string | null): string {
  return formatDateOnlyEsCO(value);
}

function getDateRange(preset: "today" | "week" | "month"): { from: string; to: string } {
  const today = new Date();
  const to = todayDateColombia(today);
  if (preset === "today") {
    return { from: to, to };
  }
  const from = new Date(today);
  if (preset === "week") from.setDate(from.getDate() - 6);
  else from.setMonth(from.getMonth() - 1);
  return { from: todayDateColombia(from), to };
}

function getDateFilterSummary(filterFrom?: string, filterTo?: string): string | null {
  if (!filterFrom && !filterTo) return null;
  const today = getDateRange("today");
  const week = getDateRange("week");
  const month = getDateRange("month");
  if (filterFrom === today.from && (!filterTo || filterTo === today.to)) return "Hoy";
  if (filterFrom === week.from && filterTo === week.to) return "Últimos 7 días";
  if (filterFrom === month.from && filterTo === month.to) return "Últimos 30 días";
  if (filterFrom && filterTo) {
    return `${formatDateOnlyEsCO(filterFrom)} – ${formatDateOnlyEsCO(filterTo)}`;
  }
  if (filterFrom) return `Desde ${formatDateOnlyEsCO(filterFrom)}`;
  if (filterTo) return `Hasta ${formatDateOnlyEsCO(filterTo)}`;
  return null;
}

interface InventoryClientProps {
  batches: InventoryBatchWithLines[];
  legacyMovements: MovementWithProduct[];
  filterFrom?: string;
  filterTo?: string;
  filterProductId?: string;
  filterProductName?: string | null;
}

type DailyMovementGroup = {
  dateKey: string;
  label: string;
  entries: MovementWithProduct[];
};

function formatGroupDateLabel(dateKey: string): string {
  try {
    const d = new Date(`${dateKey}T00:00:00`);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (isToday) return `Hoy · ${d.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}`;
    return d.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateKey;
  }
}

function groupMovementsByDate(rows: MovementWithProduct[]): DailyMovementGroup[] {
  const grouped = new Map<string, MovementWithProduct[]>();
  for (const row of rows) {
    const key = (row.movement_date ?? "").slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(row);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, entries]) => {
      return {
        dateKey,
        label: formatGroupDateLabel(dateKey),
        entries: entries.sort((a, b) => {
          const aTs = new Date(a.created_at ?? a.movement_date).getTime();
          const bTs = new Date(b.created_at ?? b.movement_date).getTime();
          return bTs - aTs;
        }),
      };
    });
}

export function InventoryClient({
  batches,
  legacyMovements,
  filterFrom,
  filterTo,
  filterProductId,
  filterProductName,
}: InventoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [formOpen, setFormOpen] = React.useState(false);
  const [formInitialType, setFormInitialType] = React.useState<InventoryMovementPreset>("in");
  const [movementFormDirty, setMovementFormDirty] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [movementToDelete, setMovementToDelete] = React.useState<MovementWithProduct | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchToDelete, setBatchToDelete] = React.useState<InventoryBatchWithLines | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = React.useState(false);
  const [batchDetailOpen, setBatchDetailOpen] = React.useState(false);
  const [batchDetail, setBatchDetail] = React.useState<InventoryBatchWithLines | null>(null);
  const [productFilterOpen, setProductFilterOpen] = React.useState(false);
  const [dateFilterOpen, setDateFilterOpen] = React.useState(false);
  const [localFrom, setLocalFrom] = React.useState(filterFrom ?? "");
  const [localTo, setLocalTo] = React.useState(filterTo ?? "");
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [productSearchResults, setProductSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [productSearching, setProductSearching] = React.useState(false);
  const [leavePromptOpen, setLeavePromptOpen] = React.useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = React.useState<string | null>(null);
  const productSearchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const guardEnabled = formOpen && movementFormDirty;

  useUnsavedChangesGuard({ enabled: guardEnabled });

  useNavigationGuardRegistration(
    guardEnabled,
    (href) => {
      setPendingLeaveHref(href);
      setLeavePromptOpen(true);
    },
    { allowPathPrefix: "/dashboard/inventory" },
  );

  React.useEffect(() => {
    if (!formOpen) setMovementFormDirty(false);
  }, [formOpen]);

  function confirmLeaveInventory() {
    setLeavePromptOpen(false);
    const href = pendingLeaveHref;
    setPendingLeaveHref(null);
    setFormOpen(false);
    if (href) router.push(href);
  }

  function cancelLeaveInventory() {
    setPendingLeaveHref(null);
    setLeavePromptOpen(false);
  }

  React.useEffect(() => {
    setLocalFrom(filterFrom ?? "");
    setLocalTo(filterTo ?? "");
  }, [filterFrom, filterTo]);

  React.useEffect(() => {
    const q = productSearchQuery.trim();
    if (q.length < 2) {
      setProductSearchResults([]);
      return;
    }
    if (productSearchDebounce.current) clearTimeout(productSearchDebounce.current);
    productSearchDebounce.current = setTimeout(() => {
      setProductSearching(true);
      searchProductsForMovement(q).then((res) => {
        setProductSearchResults(res);
        setProductSearching(false);
      });
    }, 300);
    return () => {
      if (productSearchDebounce.current) clearTimeout(productSearchDebounce.current);
    };
  }, [productSearchQuery]);

  function openRegisterForm(preset: InventoryMovementPreset = "in") {
    setFormInitialType(preset);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    router.refresh();
  }

  function openDeleteDialog(row: MovementWithProduct) {
    setMovementToDelete(row);
    setDeleteDialogOpen(true);
  }

  function buildFilterUrl(opts: { from?: string; to?: string; productId?: string }) {
    const params = new URLSearchParams();
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    if (opts.productId) params.set("product", opts.productId);
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  async function handleConfirmDelete() {
    if (!movementToDelete?.id) return;
    setIsDeleting(true);
    const result = await deleteMovement(movementToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setMovementToDelete(null);
    if (result.success) {
      triggerSuccess();
      toast.success("Movimiento eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar");
    }
  }

  function openBatchDetail(batch: InventoryBatchWithLines) {
    setBatchDetail(batch);
    setBatchDetailOpen(true);
  }

  function openBatchDeleteDialog(batch: InventoryBatchWithLines) {
    setBatchToDelete(batch);
    setBatchDeleteOpen(true);
  }

  async function handleConfirmDeleteBatch() {
    if (!batchToDelete?.id) return;
    setIsDeletingBatch(true);
    const result = await deleteInventoryBatch(batchToDelete.id);
    setIsDeletingBatch(false);
    setBatchDeleteOpen(false);
    setBatchToDelete(null);
    if (result.success) {
      triggerSuccess();
      toast.success("Comprobante eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el comprobante");
    }
  }

  const hasDateFilter = Boolean(filterFrom || filterTo);
  const dateFilterSummary = getDateFilterSummary(filterFrom, filterTo);
  const hasProductFilter = Boolean(filterProductId);
  const legacyDailyGroups = React.useMemo(
    () => groupMovementsByDate(legacyMovements),
    [legacyMovements]
  );
  const hasAnyData = batches.length > 0 || legacyMovements.length > 0;
  const movementLineCount =
    batches.reduce((sum, b) => sum + b.lines.length, 0) + legacyMovements.length;

  return (
    <div className="space-y-6">
      <InventoryMovementHero
        batchCount={batches.length}
        movementLineCount={movementLineCount}
        onRegister={openRegisterForm}
        activePreset={formOpen ? formInitialType : null}
        onOpenProductFilter={() => setProductFilterOpen(true)}
        hasProductFilter={hasProductFilter}
        productFilterName={filterProductName}
        onOpenDateFilter={() => setDateFilterOpen(true)}
        hasDateFilter={hasDateFilter}
        dateFilterLabel={dateFilterSummary}
      />

      <InventoryProductFilterDialog
        open={productFilterOpen}
        onOpenChange={setProductFilterOpen}
        searchQuery={productSearchQuery}
        onSearchQueryChange={setProductSearchQuery}
        onSearchClear={() => setProductSearchQuery("")}
        searching={productSearching}
        results={productSearchResults}
        buildProductFilterHref={(productId) =>
          buildFilterUrl({ from: filterFrom, to: filterTo, productId })
        }
      />

      <InventoryDateFilterDialog
        open={dateFilterOpen}
        onOpenChange={setDateFilterOpen}
        filterFrom={filterFrom}
        filterTo={filterTo}
        filterProductId={filterProductId}
        localFrom={localFrom}
        localTo={localTo}
        onLocalFromChange={setLocalFrom}
        onLocalToChange={setLocalTo}
        onApplyCustomRange={() => {
          router.push(
            buildFilterUrl({
              from: localFrom || undefined,
              to: localTo || undefined,
              productId: filterProductId,
            }),
          );
        }}
        buildFilterUrl={buildFilterUrl}
        getDateRange={getDateRange}
        hasDateFilter={hasDateFilter}
        hasProductFilter={hasProductFilter}
      />

      <div className="space-y-3">
        {!hasAnyData ? (
          <InventoryPanel variant="dashed" className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary ring-1 ring-primary/15">
              <Package className="size-8" />
            </div>
            <p className="mt-4 font-semibold text-foreground">
              {hasProductFilter
                ? "No hay comprobantes que incluyan este producto"
                : hasDateFilter
                  ? "No hay comprobantes en este rango de fechas"
                  : "Aún no hay comprobantes de inventario"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasProductFilter || hasDateFilter
                ? "Probá otro filtro o registrá un comprobante nuevo."
                : "Registrá entradas, salidas o ajustes: cada guardado queda como un comprobante con sus productos."}
            </p>
            {!hasProductFilter && !hasDateFilter ? (
              <Button
                className="mt-4 rounded-xl bg-gradient-to-r from-emerald-600 to-primary shadow-md shadow-primary/15"
                onClick={() => openRegisterForm()}
              >
                + Registrar movimientos
              </Button>
            ) : null}
          </InventoryPanel>
        ) : (
          <div className="space-y-6">
            {batches.length > 0 ? (
              <InventoryPanel className="p-5 sm:p-6">
                <InventorySectionHeader
                  icon={FileText}
                  title="Comprobantes de inventario"
                  badge={
                    <Badge variant="secondary" className="font-normal tabular-nums">
                      {batches.length}
                    </Badge>
                  }
                  className="mb-4"
                />
                <ul className="space-y-3">
                  {batches.map((batch) => (
                    <li key={batch.id}>
                      <InventoryBatchCard batch={batch} onOpen={openBatchDetail} />
                    </li>
                  ))}
                </ul>
              </InventoryPanel>
            ) : null}

            {legacyDailyGroups.length > 0 ? (
              <div className="space-y-4">
                <InventoryPanel
                  variant="muted"
                  className="border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-sm text-amber-950 dark:text-amber-200/90"
                >
                  <strong className="font-medium">Histórico sin comprobante.</strong> Movimientos
                  registrados antes del formato factura; siguen agrupados por día.
                </InventoryPanel>
                {legacyDailyGroups.map((group) => (
                  <InventoryPanel key={group.dateKey} variant="muted" className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize font-medium">
                          {group.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {group.entries.length} movimiento{group.entries.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {group.entries.map((row) => (
                        <li key={row.id}>
                          <MovementRowNequi
                            row={row}
                            onDelete={() => openDeleteDialog(row)}
                          />
                        </li>
                      ))}
                    </ul>
                  </InventoryPanel>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el movimiento de {movementToDelete?.product_name ?? ""} (
              {movementToDelete ? formatInventoryQuantity(movementToDelete.quantity) : ""} un.) del día{" "}
              {movementToDelete?.movement_date ? formatDate(movementToDelete.movement_date) : ""}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comprobante completo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las {batchToDelete?.lines.length ?? 0} línea
              {(batchToDelete?.lines.length ?? 0) === 1 ? "" : "s"} del comprobante del{" "}
              {batchToDelete?.movement_date ? formatDate(batchToDelete.movement_date) : ""}. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBatch}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteBatch();
              }}
              disabled={isDeletingBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBatch ? "Eliminando…" : "Eliminar comprobante"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={leavePromptOpen}
        onOpenChange={(open) => {
          if (!open) cancelLeaveInventory();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del inventario?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás registrando movimientos con datos sin guardar. Si salís del módulo ahora, se
              perderá lo que cargaste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeaveInventory}>
              Seguir editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmLeaveInventory();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar y salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InventoryBatchDetailModal
        open={batchDetailOpen}
        onOpenChange={setBatchDetailOpen}
        batch={batchDetail}
        onDeleteLine={(row) => {
          setBatchDetailOpen(false);
          openDeleteDialog(row);
        }}
        onDeleteBatch={(batch) => {
          setBatchDetailOpen(false);
          openBatchDeleteDialog(batch);
        }}
      />

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        onDirtyChange={setMovementFormDirty}
        initialMovementType={formInitialType}
      />
    </div>
  );
}
