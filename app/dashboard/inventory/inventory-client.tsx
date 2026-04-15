"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { triggerSuccess } from "@/lib/confetti";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  FileText,
  Menu,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { parsePackagingConversion } from "@/lib/parse-packaging";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";
import type { InventoryBatchWithLines, MovementWithProduct } from "./actions";
import { deleteInventoryBatch, deleteMovement, searchProductsForMovement } from "./actions";
import type { ProductSearchHit } from "./actions";

/** Dado cantidad (en unidad base) y packaging del producto, devuelve ej. "10 Cajas" o "2 Cajas madre" o null. */
function formatCajasMadre(quantity: number, packaging: string | null): string | null {
  const parsed = parsePackagingConversion(packaging);
  if (!parsed || parsed.factor <= 0) return null;
  const n = quantity / parsed.factor;
  if (n < 0.001) return null;
  const label = Number.isInteger(n) ? String(n) : n.toFixed(2);
  const u = parsed.unitName;
  const plural =
    Number(n) !== 1
      ? u === "Caja madre"
        ? "Cajas madre"
        : u === "Caja"
          ? "Cajas"
          : u === "Unidad"
            ? "Unidades"
            : `${u}s`
      : u;
  return `${label} ${plural}`;
}

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
      return "Hoy " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return value;
  }
}

function MovementRowNequi({
  row,
  formatCajasMadre,
  onDelete,
  compactMeta = false,
}: {
  row: MovementWithProduct;
  formatCajasMadre: (q: number, p: string | null) => string | null;
  onDelete: () => void;
  compactMeta?: boolean;
}) {
  const type = row.movement_type;
  const isIn = type === "in";
  const isOut = type === "out";
  const cajas = formatCajasMadre(row.quantity, row.product_packaging);

  const iconWrap =
    isIn
      ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
      : isOut
        ? "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400"
        : "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";

  return (
    <div className="grid grid-cols-[auto_minmax(0,280px)_auto_auto] items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-6">
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
          {row.product_presentation || (MOVEMENT_TYPE_LABELS[type] ?? type)}
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
          {row.movement_type === "out" ? "-" : "+"}
          {formatInventoryQuantity(row.quantity)}
        </p>
        {cajas ? (
          <p className="text-xs text-muted-foreground">{cajas}</p>
        ) : null}
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
  if (!value) return "—";
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

function getDateRange(preset: "today" | "week" | "month"): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  if (preset === "today") {
    return { from: to, to };
  }
  const from = new Date(today);
  if (preset === "week") from.setDate(from.getDate() - 6);
  else from.setMonth(from.getMonth() - 1);
  return { from: from.toISOString().slice(0, 10), to };
}

interface InventoryClientProps {
  batches: InventoryBatchWithLines[];
  legacyMovements: MovementWithProduct[];
  filterFrom?: string;
  filterTo?: string;
  filterProductId?: string;
  filterProductName?: string | null;
}

function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatInvoiceDateLabel(dateKey: string): string {
  try {
    const d = new Date(`${dateKey}T12:00:00`);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (isToday) {
      return `Hoy · ${d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`;
    }
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

function InventoryBatchInvoiceCard({
  batch,
  formatCajasMadre,
  onDeleteLine,
  onDeleteBatch,
}: {
  batch: InventoryBatchWithLines;
  formatCajasMadre: (q: number, p: string | null) => string | null;
  onDeleteLine: (row: MovementWithProduct) => void;
  onDeleteBatch: (batch: InventoryBatchWithLines) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const refShort = batch.id.replace(/-/g, "").slice(0, 10).toUpperCase();

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border bg-muted/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Comprobante de inventario
            </p>
            <p className="text-lg font-bold text-foreground leading-tight">
              {formatInvoiceDateLabel(batch.movement_date.slice(0, 10))}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Ref. {refShort}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <div className="text-left text-sm text-muted-foreground sm:text-right">
            <p>Registrado: {formatDateTimeShort(batch.created_at)}</p>
            {batch.created_by_email ? <p className="truncate max-w-[200px]">{batch.created_by_email}</p> : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-xl border-2"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls={`invoice-body-${batch.id}`}
            title={expanded ? "Ocultar detalle" : "Ver detalle del comprobante"}
          >
            <Menu className="size-5" />
            <span className="sr-only">{expanded ? "Contraer" : "Desplegar"} comprobante</span>
          </Button>
        </div>
      </header>

      {!expanded ? (
        <div
          id={`invoice-summary-${batch.id}`}
          className="flex flex-col gap-2 border-b border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">
              {batch.lines.length} producto{batch.lines.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Usá el botón menú (arriba a la derecha) para ver líneas, notas y acciones.
          </p>
        </div>
      ) : null}

      {expanded ? (
        <div id={`invoice-body-${batch.id}`}>
          {batch.notes ? (
            <div className="border-b border-border bg-muted/10 px-4 py-2.5 text-sm text-foreground">
              <span className="font-medium text-muted-foreground">Notas: </span>
              {batch.notes}
            </div>
          ) : null}
          <div className="divide-y divide-border/80">
            {batch.lines.map((row) => (
              <div key={row.id} className="px-2 py-2 sm:px-3">
                <MovementRowNequi
                  row={row}
                  formatCajasMadre={formatCajasMadre}
                  onDelete={() => onDeleteLine(row)}
                  compactMeta
                />
              </div>
            ))}
          </div>
          <footer className="flex flex-col gap-3 border-t border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">
                {batch.lines.length} línea{batch.lines.length === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
              onClick={() => onDeleteBatch(batch)}
            >
              Eliminar comprobante
            </Button>
          </footer>
        </div>
      ) : null}
    </article>
  );
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
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [movementToDelete, setMovementToDelete] = React.useState<MovementWithProduct | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchToDelete, setBatchToDelete] = React.useState<InventoryBatchWithLines | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = React.useState(false);
  const [localFrom, setLocalFrom] = React.useState(filterFrom ?? "");
  const [localTo, setLocalTo] = React.useState(filterTo ?? "");
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [productSearchResults, setProductSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [productSearching, setProductSearching] = React.useState(false);
  const productSearchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const hasProductFilter = Boolean(filterProductId);
  const legacyDailyGroups = React.useMemo(
    () => groupMovementsByDate(legacyMovements),
    [legacyMovements]
  );
  const hasAnyData = batches.length > 0 || legacyMovements.length > 0;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        icon={Package}
        title="Inventario P16"
        description="Comprobantes por guardado (varios productos) y histórico sin comprobante."
        actions={
          <Button onClick={() => setFormOpen(true)} className="h-11 rounded-xl w-fit sm:w-auto">
            + Registrar movimientos
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Package className="size-4" />
          Comprobantes que incluyen un producto
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto (comprobantes que lo incluyan, mín. 2 caracteres)"
            className="max-w-sm rounded-lg h-9 pl-9"
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
          />
          {productSearchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full max-w-sm overflow-y-auto rounded-lg border border-border bg-background shadow-md">
              {productSearching ? (
                <div className="py-3 text-center text-sm text-muted-foreground">Buscando…</div>
              ) : productSearchResults.length === 0 ? (
                <div className="py-3 text-center text-sm text-muted-foreground">Sin resultados.</div>
              ) : (
                <ul className="py-1">
                  {productSearchResults.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={buildFilterUrl({
                          from: filterFrom,
                          to: filterTo,
                          productId: p.id,
                        })}
                        className="block px-3 py-2 text-left text-sm hover:bg-muted/50"
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.presentation ? (
                          <span className="ml-1 text-muted-foreground">({p.presentation})</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {hasProductFilter && filterProductName ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 mt-1">
            <Badge variant="secondary" className="font-normal">
              Filtrando por: {filterProductName}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground" asChild>
              <Link href={buildFilterUrl({ from: filterFrom, to: filterTo })}>
                <X className="size-3.5" />
                Ver todos los comprobantes
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="size-4" />
          Fecha del comprobante
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={!hasDateFilter && !hasProductFilter ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={buildFilterUrl({ productId: filterProductId })}>Todo</Link>
          </Button>
          <Button
            variant={filterFrom === getDateRange("today").from ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={buildFilterUrl({
                ...getDateRange("today"),
                productId: filterProductId,
              })}
            >
              Hoy
            </Link>
          </Button>
          <Button
            variant={filterFrom === getDateRange("week").from ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={buildFilterUrl({
                ...getDateRange("week"),
                productId: filterProductId,
              })}
            >
              Últimos 7 días
            </Link>
          </Button>
          <Button
            variant={filterFrom === getDateRange("month").from ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={buildFilterUrl({
                ...getDateRange("month"),
                productId: filterProductId,
              })}
            >
              Últimos 30 días
            </Link>
          </Button>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                buildFilterUrl({
                  from: localFrom || undefined,
                  to: localTo || undefined,
                  productId: filterProductId,
                })
              );
            }}
          >
            <Input
              type="date"
              className="h-9 w-40"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              placeholder="Desde"
            />
            <Input
              type="date"
              className="h-9 w-40"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              placeholder="Hasta"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-9">
              Aplicar
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-3">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Package className="size-8" />
            </div>
            <p className="mt-4 font-medium text-foreground">
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
                className="mt-4 rounded-xl"
                onClick={() => setFormOpen(true)}
              >
                + Registrar movimientos
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-8">
            {batches.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="size-4" />
                  Comprobantes de inventario
                </div>
                <ul className="space-y-4">
                  {batches.map((batch) => (
                    <li key={batch.id}>
                      <InventoryBatchInvoiceCard
                        batch={batch}
                        formatCajasMadre={formatCajasMadre}
                        onDeleteLine={(row) => openDeleteDialog(row)}
                        onDeleteBatch={openBatchDeleteDialog}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {legacyDailyGroups.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-200/90">
                  <strong className="font-medium">Histórico sin comprobante.</strong> Movimientos
                  registrados antes del formato factura; siguen agrupados por día.
                </div>
                {legacyDailyGroups.map((group) => (
                  <section
                    key={group.dateKey}
                    className="rounded-2xl border border-border/70 bg-muted/10 p-4 space-y-3"
                  >
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
                            formatCajasMadre={formatCajasMadre}
                            onDelete={() => openDeleteDialog(row)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
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

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
