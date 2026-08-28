"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  History,
  List,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatDateLongEsCO,
  formatDateOnlyEsCO,
  formatDateTimeNumericEsCO,
  resolveInventoryBatchDisplayDate,
} from "@/lib/calendar-date";
import {
  formatMovementQuantityLabel,
  getStockDisplayInfo,
} from "@/lib/inventory-stock-display";
import type { BatchLineStockImpact, InventoryBatchWithLines } from "@/app/dashboard/inventory/actions";
import { getBatchStockImpact } from "@/app/dashboard/inventory/actions";
import type { MovementWithProduct } from "@/app/dashboard/inventory/actions";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

type DetailView = "lines" | "changes";

function MovementTypeIcon({ type }: { type: string }) {
  if (type === "in") return <ArrowDownLeft className="size-4" />;
  if (type === "out") return <ArrowUpRight className="size-4" />;
  return <RefreshCw className="size-4" />;
}

function movementTypeStyles(type: string): string {
  if (type === "in") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (type === "out") return "bg-red-500/15 text-red-600 dark:text-red-400";
  return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
}

function formatStockValue(
  value: number,
  packaging: string | null,
  presentation?: string | null,
): string {
  return getStockDisplayInfo(value, packaging, presentation).primary;
}

interface InventoryBatchDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: InventoryBatchWithLines | null;
  onDeleteLine: (row: MovementWithProduct) => void;
  onDeleteBatch: (batch: InventoryBatchWithLines) => void;
}

export function InventoryBatchDetailModal({
  open,
  onOpenChange,
  batch,
  onDeleteLine,
  onDeleteBatch,
}: InventoryBatchDetailModalProps) {
  const [view, setView] = React.useState<DetailView>("lines");
  const [stockImpact, setStockImpact] = React.useState<BatchLineStockImpact[]>([]);
  const [loadingImpact, setLoadingImpact] = React.useState(false);
  const [impactError, setImpactError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setView("lines");
      setStockImpact([]);
      setImpactError(null);
      return;
    }
    if (!batch?.id) return;

    setLoadingImpact(true);
    setImpactError(null);
    getBatchStockImpact(batch.id).then((result) => {
      if (result.success) {
        setStockImpact(result.lines);
      } else {
        setImpactError(result.error);
        setStockImpact([]);
      }
      setLoadingImpact(false);
    });
  }, [open, batch?.id]);

  if (!batch) return null;

  const refShort = batch.id.replace(/-/g, "").slice(0, 10).toUpperCase();
  const displayDateKey = resolveInventoryBatchDisplayDate(
    batch.movement_date,
    batch.created_at,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        overlayClassName="bg-black/50 backdrop-blur-md"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Comprobante de inventario</DialogTitle>
        <DialogDescription className="sr-only">
          Detalle del comprobante y cambios en stock
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <header className="relative border-b border-border bg-gradient-to-br from-primary/15 via-card to-card px-6 py-5 pr-14 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <FileText className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Comprobante de inventario
                </p>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  {formatDateLongEsCO(displayDateKey)}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono">Ref. {refShort}</span>
                  <span>Registrado: {formatDateTimeNumericEsCO(batch.created_at)}</span>
                  {batch.created_by_email ? <span>{batch.created_by_email}</span> : null}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 size-9 rounded-lg"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </Button>
          </header>

          {batch.notes ? (
            <div className="border-b border-border bg-muted/10 px-6 py-3 text-sm text-foreground">
              <span className="font-medium text-muted-foreground">Notas: </span>
              {batch.notes}
            </div>
          ) : null}

          <div className="border-b border-border px-6 py-3">
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setView("lines")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === "lines"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-4" />
                Líneas ({batch.lines.length})
              </button>
              <button
                type="button"
                onClick={() => setView("changes")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === "changes"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <History className="size-4" />
                Cambios en stock
              </button>
            </div>
          </div>

          <div className="max-h-[min(52vh,420px)] overflow-y-auto px-6 py-4">
            {view === "lines" ? (
              <ul className="space-y-2">
                {batch.lines.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/10 p-3"
                  >
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        movementTypeStyles(row.movement_type),
                      )}
                    >
                      <MovementTypeIcon type={row.movement_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{row.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {MOVEMENT_TYPE_LABELS[row.movement_type] ?? row.movement_type}
                        {row.product_packaging ? ` · ${row.product_packaging}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-base font-bold tabular-nums">
                      {row.movement_type === "out" ? "−" : row.movement_type === "in" ? "+" : ""}
                      {formatMovementQuantityLabel(
                        row.quantity,
                        row.product_packaging,
                        row.product_presentation,
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDeleteLine(row)}
                      title="Eliminar línea"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : loadingImpact ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Calculando cambios en stock…
              </p>
            ) : impactError ? (
              <p className="py-8 text-center text-sm text-destructive">{impactError}</p>
            ) : stockImpact.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay líneas en este comprobante.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Movimiento</TableHead>
                    <TableHead className="text-right">Saldo anterior</TableHead>
                    <TableHead className="text-right">Saldo nuevo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockImpact.map((row) => (
                    <TableRow key={row.movementId}>
                      <TableCell className="max-w-[140px]">
                        <p className="truncate font-medium">{row.productName}</p>
                        {row.productPackaging ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.productPackaging}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                            movementTypeStyles(row.movementType),
                          )}
                        >
                          <MovementTypeIcon type={row.movementType} />
                          {row.movementType === "out" ? "−" : row.movementType === "in" ? "+" : ""}
                          {formatMovementQuantityLabel(
                            row.quantity,
                            row.productPackaging,
                            row.productPresentation,
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatStockValue(
                          row.stockBefore,
                          row.productPackaging,
                          row.productPresentation,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatStockValue(
                          row.stockAfter,
                          row.productPackaging,
                          row.productPresentation,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <footer className="flex flex-col gap-2 border-t border-border bg-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Fecha del comprobante: {formatDateOnlyEsCO(displayDateKey)}
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => onDeleteBatch(batch)}
            >
              Eliminar comprobante
            </Button>
          </footer>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
