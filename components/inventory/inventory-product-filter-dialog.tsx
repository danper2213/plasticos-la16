"use client";

import Link from "next/link";
import { Package, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardSearchBar } from "@/components/layout/dashboard-search-bar";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";

type InventoryProductFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchClear: () => void;
  searching: boolean;
  results: ProductSearchHit[];
  buildProductFilterHref: (productId: string) => string;
};

export function InventoryProductFilterDialog({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  onSearchClear,
  searching,
  results,
  buildProductFilterHref,
}: InventoryProductFilterDialogProps) {
  const q = searchQuery.trim();
  const showResults = q.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden rounded-2xl border border-border p-0"
        overlayClassName="bg-black/50 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Buscar comprobantes por producto</DialogTitle>
        <DialogDescription className="sr-only">
          Filtrá la lista de comprobantes que incluyan un producto
        </DialogDescription>

        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Package className="size-4" aria-hidden />
            <p className="text-sm font-semibold text-foreground">Buscar por producto</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Opcional — mostrá solo comprobantes que incluyan ese producto.
          </p>
        </div>

        <div className="space-y-3 p-5">
          <DashboardSearchBar
            variant="default"
            align="start"
            alwaysExpanded
            value={searchQuery}
            onChange={onSearchQueryChange}
            onClear={onSearchClear}
            onSubmit={() => undefined}
            placeholder="Nombre o código (mín. 2 caracteres)"
            ariaLabel="Buscar producto en comprobantes"
          />

          {showResults ? (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-border/60 bg-muted/10">
              {searching ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Buscando…</p>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
              ) : (
                <ul className="divide-y divide-border/60 py-1">
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={buildProductFilterHref(p.id)}
                        onClick={() => onOpenChange(false)}
                        className="flex items-start gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Search className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                        <span>
                          <span className="font-medium text-foreground">{p.name}</span>
                          {p.packaging ? (
                            <span className="ml-1 text-muted-foreground">({p.packaging})</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Escribí al menos 2 caracteres para ver productos.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
