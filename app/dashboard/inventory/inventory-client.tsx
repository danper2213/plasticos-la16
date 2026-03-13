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
import { triggerSuccess } from "@/lib/confetti";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { parsePackagingConversion } from "@/lib/parse-packaging";
import type { MovementWithProduct } from "./actions";
import { deleteMovement, searchProductsForMovement } from "./actions";
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
}: {
  row: MovementWithProduct;
  formatCajasMadre: (q: number, p: string | null) => string | null;
  onDelete: () => void;
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
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDateShort(row.movement_date)}
          {row.created_by_email ? ` · ${row.created_by_email}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold tabular-nums text-foreground">
          {row.movement_type === "out" ? "-" : "+"}
          {row.quantity}
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
  movements: MovementWithProduct[];
  filterFrom?: string;
  filterTo?: string;
  filterProductId?: string;
  filterProductName?: string | null;
}

export function InventoryClient({
  movements,
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

  const hasDateFilter = Boolean(filterFrom || filterTo);
  const hasProductFilter = Boolean(filterProductId);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kardex / Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Movimientos de inventario (entradas, salidas y ajustes).
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-fit">
          + Registrar Movimiento
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Package className="size-4" />
          Historial por producto
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto para ver historial (mín. 2 caracteres)"
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
              Historial de: {filterProductName}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground" asChild>
              <Link href={buildFilterUrl({ from: filterFrom, to: filterTo })}>
                <X className="size-3.5" />
                Ver todos los movimientos
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="size-4" />
          Filtrar por días
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
        {movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Package className="size-8" />
            </div>
            <p className="mt-4 font-medium text-foreground">
              {hasProductFilter
                ? "No hay movimientos para este producto"
                : hasDateFilter
                  ? "No hay movimientos en este rango de fechas"
                  : "Aún no hay movimientos"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasProductFilter || hasDateFilter
                ? "Prueba otro filtro o registra un movimiento."
                : 'Registra una entrada, salida o ajuste para ver el historial aquí.'}
            </p>
            {!hasProductFilter && !hasDateFilter ? (
              <Button
                className="mt-4 rounded-xl"
                onClick={() => setFormOpen(true)}
              >
                + Registrar movimiento
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {movements.map((row) => (
              <li key={row.id}>
                <MovementRowNequi
                  row={row}
                  formatCajasMadre={formatCajasMadre}
                  onDelete={() => openDeleteDialog(row)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el movimiento de {movementToDelete?.product_name ?? ""} ({movementToDelete?.quantity} un.) del día{" "}
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

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
