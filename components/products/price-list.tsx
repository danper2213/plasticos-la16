"use client";

import * as React from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  Building2,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  QrCode,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeEsCO } from "@/lib/calendar-date";
import { formatCop } from "@/lib/format";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";
import { cn } from "@/lib/utils";
import { SearchLottie } from "@/components/ui/search-lottie";
import type { SearchSuggestion } from "@/lib/searchEngine";
import type { ProductWithRelations } from "@/app/dashboard/products/actions";

function formatPriceCop(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function StockBadge({ quantity }: { quantity: number }) {
  const isZero = quantity === 0;
  const isLow = quantity > 0 && quantity <= 20;
  const isPlenty = quantity > 20;

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 px-2.5 py-0.5 tabular-nums border font-medium shadow-none",
        isZero &&
          "border-border/70 bg-muted/35 text-muted-foreground dark:border-zinc-700/70 dark:bg-zinc-900/65 dark:text-zinc-400",
        isLow &&
          "border-amber-500/25 bg-amber-500/[0.08] text-amber-800 dark:border-amber-500/22 dark:bg-amber-500/[0.07] dark:text-amber-400/95",
        isPlenty &&
          "border-border/60 bg-muted/45 text-foreground/90 dark:border-zinc-700/55 dark:bg-zinc-800/55 dark:text-zinc-200",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Package className="w-3 h-3 shrink-0 opacity-80" />
        <span>
          {isZero ? "Sin stock" : `Stock: ${formatInventoryQuantity(quantity)}`}
        </span>
      </div>
    </Badge>
  );
}

export interface PriceListProps {
  products: ProductWithRelations[];
  totalCount: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onFetchSuggestions: (query: string) => Promise<SearchSuggestion[]>;
  onPageChange: (page: number) => void;
  totalRegistered: number;
  hasActiveFilters?: boolean;
  onEdit: (product: ProductWithRelations) => void;
  onSimulate: (product: ProductWithRelations) => void;
  onDelete: (product: ProductWithRelations) => void;
}

export function PriceList({
  products,
  totalCount,
  page,
  totalPages,
  isLoading = false,
  searchQuery,
  onSearchQueryChange,
  onFetchSuggestions,
  onPageChange,
  totalRegistered,
  hasActiveFilters = false,
  onEdit,
  onSimulate,
  onDelete,
}: PriceListProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isSearching = searchQuery.trim().length > 0;
  const showEmptySearch = isSearching && !isLoading && products.length === 0 && totalCount === 0;

  const showSuggestions =
    suggestionsOpen && searchQuery.trim().length > 0 && (suggestions.length > 0 || suggestionsLoading);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [searchQuery, suggestions.length]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) setSuggestionsLoading(true);
    }, 120);

    void onFetchSuggestions(q).then((items) => {
      if (cancelled) return;
      window.clearTimeout(loadingTimer);
      setSuggestions(items);
      setSuggestionsLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [searchQuery, onFetchSuggestions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function applySuggestion(suggestion: SearchSuggestion) {
    onSearchQueryChange(suggestion.label);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      const picked = suggestions[activeSuggestionIndex];
      if (picked) applySuggestion(picked);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 px-1 pb-3 pt-0.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div
          ref={searchContainerRef}
          className="relative rounded-xl border border-border/80 bg-card shadow-sm transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        >
          <Search
            className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-primary/85"
            aria-hidden
          />
          <Input
            type="search"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="price-list-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={
              activeSuggestionIndex >= 0
                ? `price-suggestion-${activeSuggestionIndex}`
                : undefined
            }
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar: portacomida, j1, 12oz…"
            className="h-12 w-full rounded-xl border-0 bg-transparent pl-12 pr-4 text-base shadow-none focus-visible:ring-0"
            aria-label="Buscar productos con sugerencias"
            autoComplete="off"
          />

          {showSuggestions ? (
            <ul
              id="price-list-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border/90 bg-popover py-1 shadow-lg"
            >
              {suggestionsLoading ? (
                <li className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                  <SearchLottie size={28} ariaLabel="Buscando sugerencias" />
                  Buscando sugerencias…
                </li>
              ) : (
                suggestions.map((suggestion, index) => (
                  <li key={`${suggestion.productId}-${suggestion.subtitle}`} role="option">
                    <button
                      type="button"
                      id={`price-suggestion-${index}`}
                      aria-selected={index === activeSuggestionIndex}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors",
                        index === activeSuggestionIndex
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground hover:bg-muted/80",
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <span className="font-semibold leading-snug">{suggestion.label}</span>
                      {suggestion.subtitle ? (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.subtitle}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        {isSearching || totalCount > 0 ? (
          <div
            className="mt-2 text-xs text-muted-foreground tabular-nums"
            role="status"
            aria-live="polite"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <SearchLottie size={22} ariaLabel="Cargando resultados" />
                <span>Cargando resultados…</span>
              </div>
            ) : (
              <>
                {totalCount} resultado{totalCount === 1 ? "" : "s"}
                {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
              </>
            )}
          </div>
        ) : null}
      </div>

      {showEmptySearch ? (
        <div className="rounded-2xl border border-dashed border-border/90 bg-muted/20 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <SearchX className="size-7" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No encontramos &quot;{searchQuery.trim()}&quot;
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Revisa la ortografía o prueba términos más generales.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5 rounded-lg"
            onClick={() => onSearchQueryChange("")}
          >
            Limpiar búsqueda
          </Button>
        </div>
      ) : products.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground shadow-sm">
          {totalRegistered === 0
            ? 'No hay productos registrados. Haga clic en "Nuevo Producto" para agregar uno.'
            : hasActiveFilters
              ? "Ningún resultado coincide con los filtros."
              : "No hay productos para mostrar."}
        </div>
      ) : (
        <div className="relative">
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-[1px]">
              <SearchLottie size={88} ariaLabel="Cargando productos" />
            </div>
          ) : null}

          <div
            className={cn(
              "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              isLoading && "opacity-60 pointer-events-none",
            )}
          >
            {products.map((product) => (
              <article
                key={product.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md hover:shadow-slate-900/5 dark:hover:shadow-primary/10"
              >
                <header className="flex flex-row items-start justify-between gap-2 p-5 pb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold tracking-tight text-foreground leading-tight">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {product.category_name}
                    </p>
                  </div>
                  <StockBadge quantity={product.stock_quantity ?? 0} />
                </header>

                <div className="mb-2 mt-2 flex flex-wrap gap-2 px-5">
                  <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-muted/60">
                    <Package className="size-3.5 shrink-0 text-primary" />
                    <span>{product.presentation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-muted/60">
                    <Boxes className="size-3.5 shrink-0 text-primary" />
                    <span>{product.packaging ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-muted/60">
                    <Building2 className="size-3.5 shrink-0 text-primary" />
                    <span>{product.supplier_name}</span>
                  </div>
                </div>

                <div className="mx-5 mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col rounded-xl border border-border/80 bg-slate-50/90 p-3 dark:bg-muted/30">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Precio venta
                    </span>
                    <span className="text-lg font-black tabular-nums text-primary">
                      {formatPriceCop(product.selling_price)}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-xl border border-border/80 bg-slate-50/90 p-3 dark:bg-muted/30">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Costo base
                    </span>
                    <span className="text-lg font-black tabular-nums text-foreground/90">
                      {formatCop(product.cost)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-0.5 px-5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      Última actualización:{" "}
                      {formatDateTimeEsCO(
                        product.updated_at ?? product.created_at ?? null,
                      )}
                    </span>
                  </div>
                </div>

                <footer className="mt-4 flex justify-end gap-2 border-t border-border/70 bg-slate-50/50 px-5 pb-4 pt-3 dark:bg-muted/30">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Editar producto"
                    onClick={() => onEdit(product)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Simular precio"
                    onClick={() => onSimulate(product)}
                  >
                    <Calculator className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Etiqueta QR para imprimir"
                    asChild
                  >
                    <Link
                      href={`/dashboard/products/etiqueta?id=${encodeURIComponent(product.id)}`}
                    >
                      <QrCode className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Eliminar producto"
                    onClick={() => onDelete(product)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-3 border-t border-border/70 pt-4"
          aria-label="Paginación de productos"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 rounded-lg"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Anterior
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Página <span className="font-semibold text-foreground">{page}</span> de{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 rounded-lg"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
