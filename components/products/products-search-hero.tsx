"use client";

import { forwardRef } from "react";
import {
  Barcode,
  FileSpreadsheet,
  Filter,
  Package,
  ScanLine,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchLottie } from "@/components/ui/search-lottie";
import {
  DashboardSearchBar,
  type DashboardSearchBarHandle,
  type SearchBarMicState,
} from "@/components/layout/dashboard-search-bar";
import {
  DashboardFeatureHeroBadge,
  DashboardFeatureHeroPanel,
  DashboardFeatureHeroShell,
  DashboardFeatureHeroTitle,
} from "@/components/layout/dashboard-feature-hero-shell";
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

const SEARCH_EXAMPLE_TERMS = QUICK_SEARCHES.map(({ label }) => label);

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
  onNewProduct?: () => void;
  onUpdateCostsFromInvoice?: () => void;
  micState?: SearchBarMicState;
  onMicClick?: () => void;
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
      <span
        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10"
      >
        <Zap className="size-3.5" aria-hidden />
        <span className="tabular-nums">
          {totalCount} resultado{totalCount === 1 ? "" : "s"}
          {isSearching ? " · por relevancia" : ""}
          {totalPages > 1 ? ` · pág. ${page}/${totalPages}` : ""}
        </span>
      </span>
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
      onNewProduct,
      onUpdateCostsFromInvoice,
      micState,
      onMicClick,
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
      <DashboardFeatureHeroShell
        ariaLabel="Búsqueda de productos"
        left={
          <>
            <DashboardFeatureHeroBadge>
              <Sparkles className="size-3.5" aria-hidden />
              Búsqueda inteligente
            </DashboardFeatureHeroBadge>

            <DashboardFeatureHeroTitle
              line1="Encuentra cualquier"
              line2="producto al instante"
            />

            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Nombre, código o medida. Preguntá el precio o el stock por voz, o tocá una sugerencia.
            </p>

            {onNewProduct || onUpdateCostsFromInvoice ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {onNewProduct ? (
                  <Button
                    type="button"
                    onClick={onNewProduct}
                    className="h-11 gap-2 rounded-xl border-0 bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/25"
                  >
                    <Package className="size-4" aria-hidden />
                    Nuevo Producto
                  </Button>
                ) : null}
                {onUpdateCostsFromInvoice ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onUpdateCostsFromInvoice}
                    className="h-11 gap-2 rounded-xl border-border/70 bg-background/60 px-5 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10"
                  >
                    <FileSpreadsheet className="size-4" aria-hidden />
                    Costos desde factura
                  </Button>
                ) : null}
              </div>
            ) : null}

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
          </>
        }
        right={
          <DashboardFeatureHeroPanel>
            <DashboardSearchBar
              ref={ref}
              variant="hero"
              align="start"
              alwaysExpanded
              value={searchQuery}
              onChange={onSearchQueryChange}
              onClear={onSearchClear}
              onSubmit={onSearchSubmit}
              placeholder="Buscar por nombre, código o medida…"
              rotatingPlaceholder={SEARCH_EXAMPLE_TERMS}
              ariaLabel="Buscar productos"
              micState={micState}
              onMicClick={onMicClick}
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
          </DashboardFeatureHeroPanel>
        }
      />
    );
  },
);

export type { DashboardSearchBarHandle as ProductSearchBarHandle };
