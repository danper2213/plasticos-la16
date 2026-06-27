"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { inventoryFilterButtonClass } from "@/components/inventory/inventory-ui";

type DateRangePreset = "today" | "week" | "month";

type InventoryDateFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterFrom?: string;
  filterTo?: string;
  filterProductId?: string;
  localFrom: string;
  localTo: string;
  onLocalFromChange: (value: string) => void;
  onLocalToChange: (value: string) => void;
  onApplyCustomRange: () => void;
  buildFilterUrl: (opts: {
    from?: string;
    to?: string;
    productId?: string;
  }) => string;
  getDateRange: (preset: DateRangePreset) => { from: string; to: string };
  hasDateFilter: boolean;
  hasProductFilter: boolean;
};

export function InventoryDateFilterDialog({
  open,
  onOpenChange,
  filterFrom,
  filterTo,
  filterProductId,
  localFrom,
  localTo,
  onLocalFromChange,
  onLocalToChange,
  onApplyCustomRange,
  buildFilterUrl,
  getDateRange,
  hasDateFilter,
  hasProductFilter,
}: InventoryDateFilterDialogProps) {
  const todayRange = getDateRange("today");
  const weekRange = getDateRange("week");
  const monthRange = getDateRange("month");

  const isAll =
    !hasDateFilter && !hasProductFilter;
  const isToday = filterFrom === todayRange.from && (!filterTo || filterTo === todayRange.to);
  const isWeek =
    filterFrom === weekRange.from && filterTo === weekRange.to;
  const isMonth =
    filterFrom === monthRange.from && filterTo === monthRange.to;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden rounded-2xl border border-border p-0"
        overlayClassName="bg-black/50 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Filtrar por fecha del comprobante</DialogTitle>
        <DialogDescription className="sr-only">
          Opcional — acotá la lista de comprobantes por rango de fechas
        </DialogDescription>

        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="size-4" aria-hidden />
            <p className="text-sm font-semibold text-foreground">Fecha del comprobante</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Opcional — filtrá comprobantes por día o rango personalizado.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isAll ? "default" : "outline"}
              size="sm"
              className={inventoryFilterButtonClass(isAll)}
              asChild
            >
              <Link
                href={buildFilterUrl({ productId: filterProductId })}
                onClick={() => onOpenChange(false)}
              >
                Todo
              </Link>
            </Button>
            <Button
              variant={isToday ? "default" : "outline"}
              size="sm"
              className={inventoryFilterButtonClass(isToday)}
              asChild
            >
              <Link
                href={buildFilterUrl({
                  ...todayRange,
                  productId: filterProductId,
                })}
                onClick={() => onOpenChange(false)}
              >
                Hoy
              </Link>
            </Button>
            <Button
              variant={isWeek ? "default" : "outline"}
              size="sm"
              className={inventoryFilterButtonClass(isWeek)}
              asChild
            >
              <Link
                href={buildFilterUrl({
                  ...weekRange,
                  productId: filterProductId,
                })}
                onClick={() => onOpenChange(false)}
              >
                Últimos 7 días
              </Link>
            </Button>
            <Button
              variant={isMonth ? "default" : "outline"}
              size="sm"
              className={inventoryFilterButtonClass(isMonth)}
              asChild
            >
              <Link
                href={buildFilterUrl({
                  ...monthRange,
                  productId: filterProductId,
                })}
                onClick={() => onOpenChange(false)}
              >
                Últimos 30 días
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rango personalizado
            </p>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onApplyCustomRange();
                onOpenChange(false);
              }}
            >
              <div className="space-y-1">
                <label htmlFor="inv-filter-from" className="text-xs text-muted-foreground">
                  Desde
                </label>
                <Input
                  id="inv-filter-from"
                  type="date"
                  className="h-9 w-36 rounded-xl border-border/60 bg-background/80"
                  value={localFrom}
                  onChange={(e) => onLocalFromChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="inv-filter-to" className="text-xs text-muted-foreground">
                  Hasta
                </label>
                <Input
                  id="inv-filter-to"
                  type="date"
                  className="h-9 w-36 rounded-xl border-border/60 bg-background/80"
                  value={localTo}
                  onChange={(e) => onLocalToChange(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="h-9 rounded-xl">
                Aplicar
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { DateRangePreset };
