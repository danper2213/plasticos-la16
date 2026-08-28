"use client";

import Link from "next/link";
import {
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  QrCode,
  SearchX,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeEsCO } from "@/lib/calendar-date";
import { formatCop } from "@/lib/format";
import { getStockDisplayInfo } from "@/lib/inventory-stock-display";
import { cn } from "@/lib/utils";
import { SearchLottie } from "@/components/ui/search-lottie";
import { HighlightedText } from "@/components/products/highlighted-text";
import {
  ProductDetailsSection,
  ProductDetailField,
  productCardStyles,
} from "@/components/products/product-info-panel";
import { SupplierHighlight } from "@/components/products/supplier-highlight";
import type { ProductWithRelations } from "@/app/dashboard/products/actions";
import { unitPriceFromCostAndUtilityPercent } from "@/lib/quotes/pricing";

const LIST_SALE_UTILITY_PERCENT = 25;

function getSearchTips(query: string): string[] {
  const trimmed = query.trim();
  const tips: string[] = [];

  if (/\d/.test(trimmed) && !/\b(oz|ml|cc|lt|und)\b/i.test(trimmed)) {
    const numberMatch = trimmed.match(/\d+(?:[.,]\d+)?/);
    const sample = numberMatch?.[0] ?? trimmed;
    tips.push(`Prueba con unidad: «${sample} oz» o «${sample}oz».`);
  }

  if (trimmed.split(/\s+/).filter(Boolean).length > 2) {
    tips.push("Usa menos palabras o busca por código (ej. j1).");
  }

  tips.push("Prueba términos cortos: «vaso», «portacomida», «tapas».");
  return tips.slice(0, 3);
}

function formatActiveFiltersLabel(
  categoryName?: string,
  stockLabel?: string,
  supplierName?: string,
): string | null {
  const parts: string[] = [];
  if (supplierName) parts.push(supplierName);
  if (categoryName) parts.push(categoryName);
  if (stockLabel) parts.push(stockLabel);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatPriceCop(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function StockBadge({
  quantity,
  packaging,
  presentation,
}: {
  quantity: number;
  packaging?: string | null;
  presentation?: string;
}) {
  const isZero = quantity === 0;
  const isLow = quantity > 0 && quantity <= 20;
  const isPlenty = quantity > 20;
  const stockLabel = getStockDisplayInfo(quantity, packaging, presentation).primary;

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 rounded-lg border-border/70 bg-background/80 px-2.5 py-1 tabular-nums text-[11px] font-semibold uppercase tracking-wide shadow-none",
        isZero && "text-muted-foreground",
        isLow &&
          "border-amber-500/30 bg-amber-500/[0.08] text-amber-800 dark:text-amber-400/95",
        isPlenty && "text-foreground/90",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Package className="size-3 shrink-0 opacity-80" />
        <span className="normal-case tracking-normal">
          {isZero ? "Sin stock" : stockLabel}
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
  onSearchClear?: () => void;
  onPageChange: (page: number) => void;
  totalRegistered: number;
  hasActiveFilters?: boolean;
  activeCategoryName?: string;
  activeStockLabel?: string;
  activeSupplierName?: string;
  highlightedSupplierId?: string;
  onSupplierSelect?: (supplierId: string) => void;
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
  onSearchClear,
  onPageChange,
  totalRegistered,
  hasActiveFilters = false,
  activeCategoryName,
  activeStockLabel,
  activeSupplierName,
  highlightedSupplierId,
  onSupplierSelect,
  onEdit,
  onSimulate,
  onDelete,
}: PriceListProps) {
  const isSearching = searchQuery.trim().length > 0;
  const showEmptySearch = isSearching && !isLoading && products.length === 0 && totalCount === 0;
  const activeFiltersLabel = formatActiveFiltersLabel(
    activeCategoryName,
    activeStockLabel,
    activeSupplierName,
  );
  const searchTips = getSearchTips(searchQuery);

  return (
    <div className="space-y-4">
      {showEmptySearch ? (
        <div className="rounded-2xl border border-dashed border-border/90 bg-muted/20 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <SearchX className="size-7" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No encontramos &quot;{searchQuery.trim()}&quot;
          </h3>
          {activeFiltersLabel ? (
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
              Hay filtros activos ({activeFiltersLabel}) que pueden estar
              limitando los resultados.
            </p>
          ) : null}
          <ul className="mx-auto mt-3 max-w-md space-y-1.5 text-left text-sm text-muted-foreground">
            {searchTips.map((tip) => (
              <li key={tip} className="flex gap-2 leading-relaxed">
                <span className="text-primary" aria-hidden>
                  ·
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5 rounded-lg"
            onClick={onSearchClear}
          >
            Limpiar búsqueda
          </Button>
        </div>
      ) : products.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground shadow-sm">
          {totalRegistered === 0
            ? 'No hay productos registrados. Haga clic en "Nuevo Producto" para agregar uno.'
            : hasActiveFilters
              ? activeFiltersLabel
                ? `Ningún producto coincide con los filtros (${activeFiltersLabel}).`
                : "Ningún producto coincide con los filtros activos."
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
              <article key={product.id} className={productCardStyles.article}>
                <header className={productCardStyles.header}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={productCardStyles.label}>
                      <HighlightedText
                        text={product.category_name}
                        query={searchQuery}
                      />
                    </p>
                    <StockBadge
                      quantity={product.stock_quantity ?? 0}
                      packaging={product.packaging}
                      presentation={product.presentation}
                    />
                  </div>
                  <h3
                    className="mt-2 text-xl font-black leading-snug tracking-tight text-foreground break-words sm:text-[1.35rem]"
                    title={product.name}
                  >
                    <HighlightedText
                      text={product.name}
                      query={searchQuery}
                      highlightClassName="bg-primary/30 font-black dark:bg-primary/35"
                    />
                  </h3>
                </header>

                <div className={productCardStyles.body}>
                  <SupplierHighlight
                    supplierId={product.supplier_id}
                    supplierName={product.supplier_name}
                    searchQuery={searchQuery}
                    onSelect={onSupplierSelect}
                    emphasized={
                      highlightedSupplierId !== undefined &&
                      highlightedSupplierId !== "all" &&
                      product.supplier_id === highlightedSupplierId
                    }
                  />

                  <ProductDetailsSection>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <ProductDetailField label="Presentación">
                        <HighlightedText
                          text={product.presentation}
                          query={searchQuery}
                        />
                      </ProductDetailField>
                      <ProductDetailField label="Empaque">
                        <HighlightedText
                          text={product.packaging ?? "—"}
                          query={searchQuery}
                        />
                      </ProductDetailField>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 border-t border-border/50 pt-3">
                      <ProductDetailField
                        label={`Precio venta (+${LIST_SALE_UTILITY_PERCENT}%)`}
                        valueClassName="text-base font-bold tabular-nums text-primary"
                      >
                        {formatPriceCop(
                          unitPriceFromCostAndUtilityPercent(
                            product.cost,
                            LIST_SALE_UTILITY_PERCENT,
                          ),
                        )}
                      </ProductDetailField>
                      <ProductDetailField
                        label="Costo base"
                        valueClassName="text-base font-semibold tabular-nums"
                      >
                        {formatCop(product.cost)}
                      </ProductDetailField>
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-2.5 text-[11px] leading-snug text-muted-foreground">
                      <Calendar className="size-3 shrink-0 opacity-70" aria-hidden />
                      <span>
                        Actualizado{" "}
                        {formatDateTimeEsCO(
                          product.updated_at ?? product.created_at ?? null,
                        )}
                      </span>
                    </p>
                  </ProductDetailsSection>
                </div>

                <footer className={productCardStyles.footer}>
                  <div className={productCardStyles.footerToolbar}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      aria-label="Editar producto"
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      aria-label="Simular precio"
                      onClick={() => onSimulate(product)}
                    >
                      <Calculator className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      aria-label="Etiqueta QR para imprimir"
                      asChild
                    >
                      <Link
                        href={`/dashboard/products/etiqueta?id=${encodeURIComponent(product.id)}`}
                      >
                        <QrCode className="size-4" />
                      </Link>
                    </Button>
                    <span className="mx-0.5 h-5 w-px bg-border/60" aria-hidden />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar producto"
                      onClick={() => onDelete(product)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
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
