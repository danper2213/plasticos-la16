"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Barcode, Filter, ScanLine, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchLottie } from "@/components/ui/search-lottie";
import {
  DashboardSearchBar,
  type DashboardSearchBarHandle,
} from "@/components/layout/dashboard-search-bar";
import { cn } from "@/lib/utils";
import {
  ProductsFilterChips,
  type ActiveFilterChip,
} from "@/components/products/products-filter-chips";

const QUICK_SEARCHES = [
  { label: "vaso 7 oz", hint: "Medida" },
  { label: "j1", hint: "Código" },
  { label: "portacomida", hint: "Nombre" },
  { label: "12oz", hint: "Tamaño" },
] as const;

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
  onOpenListFilters?: () => void;
  hasListFilters?: boolean;
  listFilterLabel?: string | null;
  filterChips?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
};

function StatusPill({
  isLoading,
  isSearching,
  hasActiveFilters,
  totalCount,
  totalPages,
  page,
  totalRegistered,
}: Pick<
  ProductsSearchHeroProps,
  | "isLoading"
  | "isSearching"
  | "hasActiveFilters"
  | "totalCount"
  | "totalPages"
  | "page"
  | "totalRegistered"
>) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
        <SearchLottie size={18} ariaLabel="Cargando resultados" />
        Cargando resultados…
      </span>
    );
  }

  if (isSearching || hasActiveFilters) {
    return (
      <motion.span
        key="searching"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10"
      >
        <Zap className="size-3.5" aria-hidden />
        <span className="tabular-nums">
          {totalCount} resultado{totalCount === 1 ? "" : "s"}
          {isSearching ? " · por relevancia" : ""}
          {totalPages > 1 ? ` · pág. ${page}/${totalPages}` : ""}
        </span>
      </motion.span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
      <span className="tabular-nums">
        {totalCount} activo{totalCount === 1 ? "" : "s"}
        {totalPages > 1 ? ` · pág. ${page}/${totalPages}` : ""}
        {" · "}
        {totalRegistered} en catálogo
      </span>
    </span>
  );
}

export const ProductsSearchHero = forwardRef<DashboardSearchBarHandle, ProductsSearchHeroProps>(
  function ProductsSearchHero(
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
      onOpenListFilters,
      hasListFilters = false,
      listFilterLabel = null,
      filterChips = [],
      onClearAllFilters,
    },
    ref,
  ) {
    const showStatus =
      isLoading || isSearching || totalCount > 0 || hasActiveFilters || totalRegistered > 0;

    function applyQuickSearch(term: string) {
      onSearchQueryChange(term);
      onSearchSubmit();
    }

    return (
      <section
        className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-xl shadow-primary/5"
        aria-label="Búsqueda de productos"
      >
        {/* Fondo animado */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-background to-violet-500/[0.08] dark:from-primary/20 dark:via-zinc-950 dark:to-violet-950/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.25) 0%, transparent 45%), radial-gradient(circle at 85% 70%, rgb(139 92 246 / 0.18) 0%, transparent 40%)",
          }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-primary/20 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-violet-500/15 blur-3xl"
          animate={{ x: [0, -25, 0], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:p-10">
          {/* Copy + sugerencias */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              Búsqueda inteligente
            </div>

            <h2 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
                Encuentra cualquier
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-blue-500 to-violet-500 bg-clip-text text-transparent">
                producto al instante
              </span>
            </h2>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Nombre, código de escaneo o medida. Escribí o tocá una sugerencia para empezar.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_SEARCHES.map(({ label, hint }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyQuickSearch(label)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all",
                    "border-border/60 bg-background/60 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
                    searchQuery.trim().toLowerCase() === label.toLowerCase() &&
                      "border-primary/50 bg-primary/15 ring-1 ring-primary/25",
                  )}
                >
                  <ScanLine
                    className="size-3.5 shrink-0 text-primary/70 group-hover:text-primary"
                    aria-hidden
                  />
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {hint}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/80">
              <Barcode className="size-3.5 shrink-0" aria-hidden />
              Atajo rápido:{" "}
              <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
                /
              </kbd>
            </p>
          </motion.div>

          {/* Panel de búsqueda */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div
              className="pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-gradient-to-r from-primary/40 via-blue-500/30 to-violet-500/40 opacity-60 blur-xl dark:opacity-40"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-background/55 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl dark:bg-zinc-950/55 sm:p-5">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                aria-hidden
              />

              <DashboardSearchBar
                ref={ref}
                variant="hero"
                align="start"
                alwaysExpanded
                value={searchQuery}
                onChange={onSearchQueryChange}
                onClear={onSearchClear}
                onSubmit={onSearchSubmit}
                placeholder="Buscar: portacomida, j1, 12oz…"
                ariaLabel="Buscar productos"
              />

              {showStatus ? (
                <div className="mt-4 space-y-3" role="status" aria-live="polite">
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    <StatusPill
                      isLoading={isLoading}
                      isSearching={isSearching}
                      hasActiveFilters={hasActiveFilters}
                      totalCount={totalCount}
                      totalPages={totalPages}
                      page={page}
                      totalRegistered={totalRegistered}
                    />
                    {onOpenListFilters ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenListFilters}
                        className={cn(
                          "h-8 rounded-full border-border/60 bg-background/50 px-3 text-xs backdrop-blur-sm",
                          hasListFilters &&
                            "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                        )}
                      >
                        <Filter className="size-3.5" aria-hidden />
                        {hasListFilters
                          ? (listFilterLabel ?? "Filtros activos")
                          : "Filtrar lista"}
                      </Button>
                    ) : null}
                  </div>
                  {filterChips.length > 0 ? (
                    <ProductsFilterChips
                      chips={filterChips}
                      onClearAll={onClearAllFilters}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>
    );
  },
);

export type { DashboardSearchBarHandle as ProductSearchBarHandle };
