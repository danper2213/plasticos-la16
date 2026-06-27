"use client";

import { Building2, Filter, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { inventoryFilterButtonClass } from "@/components/inventory/inventory-ui";
import type { ActiveSupplierOption, CategoryOption } from "@/app/dashboard/products/actions";
import type { ProductsStockFilter } from "@/app/dashboard/products/list-types";
import { cn } from "@/lib/utils";

const STOCK_FILTERS: { value: ProductsStockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "no_stock", label: "Sin stock" },
  { value: "with_stock", label: "Con stock" },
];

type ProductsListFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: ActiveSupplierOption[];
  categories: CategoryOption[];
  supplierFilter: string;
  categoryFilter: string;
  stockFilter: ProductsStockFilter;
  onSupplierChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStockChange: (value: ProductsStockFilter) => void;
  onClearListFilters: () => void;
  hasListFilters: boolean;
};

export function ProductsListFilterDialog({
  open,
  onOpenChange,
  suppliers,
  categories,
  supplierFilter,
  categoryFilter,
  stockFilter,
  onSupplierChange,
  onCategoryChange,
  onStockChange,
  onClearListFilters,
  hasListFilters,
}: ProductsListFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden rounded-2xl border border-border p-0"
        overlayClassName="bg-black/50 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Filtrar lista de precios</DialogTitle>
        <DialogDescription className="sr-only">
          Opcional — acotá por proveedor, categoría o stock
        </DialogDescription>

        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Filter className="size-4" aria-hidden />
            <p className="text-sm font-semibold text-foreground">Filtros de lista</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Opcional — combiná proveedor, categoría y stock sin salir del catálogo.
          </p>
        </div>

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Proveedor
            </label>
            <Select
              value={supplierFilter}
              onValueChange={(value) => {
                onSupplierChange(value);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-background/80">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <SelectValue placeholder="Proveedor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categoría
            </label>
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                onCategoryChange(value);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-background/80">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <SelectValue placeholder="Categoría" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock
            </label>
            <div className="flex flex-wrap gap-2">
              {STOCK_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={stockFilter === value ? "default" : "outline"}
                  size="sm"
                  className={cn(inventoryFilterButtonClass(stockFilter === value), "h-9")}
                  onClick={() => onStockChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {hasListFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => {
                onClearListFilters();
                onOpenChange(false);
              }}
            >
              Quitar filtros de lista
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
