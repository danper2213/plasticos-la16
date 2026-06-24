"use client";

import { forwardRef } from "react";
import { Layers } from "lucide-react";
import { SearchLottie } from "@/components/ui/search-lottie";
import {
  ProductSearchBar,
  type ProductSearchBarHandle,
} from "@/components/products/product-search-bar";
import { cn } from "@/lib/utils";

type ProductsSearchHeroProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  totalCount: number;
  totalPages: number;
  page: number;
  totalRegistered: number;
  isLoading?: boolean;
  isSearching: boolean;
  hasActiveFilters?: boolean;
};

export const ProductsSearchHero = forwardRef<
  ProductSearchBarHandle,
  ProductsSearchHeroProps
>(function ProductsSearchHero(
  {
    searchQuery,
    onSearchQueryChange,
    onSearchClear,
    onSearchSubmit,
    totalCount,
    totalPages,
    page,
    totalRegistered,
    isLoading = false,
    isSearching,
    hasActiveFilters = false,
  },
  ref,
) {
  const showStatus = isSearching || totalCount > 0 || hasActiveFilters;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20",
        "bg-gradient-to-b from-primary/[0.09] via-primary/[0.03] to-transparent",
        "px-6 py-8 shadow-sm shadow-primary/5 dark:from-primary/[0.14] dark:via-primary/[0.04]",
      )}
      aria-label="Búsqueda de productos"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-12 size-40 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Layers className="size-5" aria-hidden />
        </div>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          ¿Qué producto buscas?
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Nombre, código de escaneo o medida — por ejemplo{" "}
          <span className="font-medium text-foreground/80">vaso 7 oz</span> o{" "}
          <span className="font-medium text-foreground/80">j1</span>
          <span className="mt-2 block text-xs text-muted-foreground/80">
            Atajos:{" "}
            <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
              /
            </kbd>
            {" · "}
            <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl+/
            </kbd>
            {" · "}
            <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl+Shift+K
            </kbd>
          </span>
        </p>

        <div className="mt-6 w-full">
          <ProductSearchBar
            ref={ref}
            variant="hero"
            value={searchQuery}
            onChange={onSearchQueryChange}
            onClear={onSearchClear}
            onSubmit={onSearchSubmit}
          />
        </div>

        {showStatus ? (
          <div
            className="mt-4 space-y-1 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 tabular-nums">
                <SearchLottie size={22} ariaLabel="Cargando resultados" />
                <span>Cargando resultados…</span>
              </div>
            ) : (
              <p className="tabular-nums">
                {isSearching || hasActiveFilters ? (
                  <>
                    {totalCount} resultado{totalCount === 1 ? "" : "s"}
                    {isSearching ? " · Ordenados por relevancia" : ""}
                    {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
                  </>
                ) : (
                  <>
                    {totalCount} producto{totalCount === 1 ? "" : "s"} activo
                    {totalCount === 1 ? "" : "s"}
                    {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
                    {" · "}
                    {totalRegistered} registrados en total
                  </>
                )}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs tabular-nums text-muted-foreground">
            {totalRegistered} productos registrados
          </p>
        )}
      </div>
    </section>
  );
});
