"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildProductsListPath,
  type ProductsListUrlState,
} from "@/lib/products-list-url";
import { Building2, Layers, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ProductForm } from "@/components/products/product-form";
import { PriceSimulatorModal } from "@/components/products/price-simulator-modal";
import { PriceList } from "@/components/products/price-list";
import {
  ProductSearchBar,
  type ProductSearchBarHandle,
} from "@/components/products/product-search-bar";
import {
  ProductsFilterChips,
  type ActiveFilterChip,
} from "@/components/products/products-filter-chips";
import { ProductsSearchHero } from "@/components/products/products-search-hero";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  buildProductsPageCacheKey,
  clearProductsListCache,
  productsPageCache,
} from "@/lib/products-list-cache";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import {
  deleteProduct,
  getProductsPage,
  type ActiveSupplierOption,
  type CategoryOption,
  type ProductWithRelations,
  type ProductsPageResult,
} from "./actions";
import type { ProductsStockFilter } from "./list-types";
import {
  isProductSearchShortcut,
  isTypingElement,
} from "@/lib/product-search-shortcut";

type StockFilter = ProductsStockFilter;

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "no_stock", label: "Sin Stock" },
  { value: "with_stock", label: "Con Stock" },
];

const SEARCH_DEBOUNCE_MS = 350;
const LOADING_DELAY_MS = 150;

interface ProductsClientProps {
  suppliers: ActiveSupplierOption[];
  categories: CategoryOption[];
  totalRegistered: number;
  initialPage: ProductsPageResult;
  initialUrl: ProductsListUrlState;
}

export function ProductsClient({
  suppliers,
  categories,
  totalRegistered,
  initialPage,
  initialUrl,
}: ProductsClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductWithRelations | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [productForSimulator, setProductForSimulator] = useState<ProductWithRelations | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>(initialUrl.stockFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialUrl.categoryId);
  const [supplierFilter, setSupplierFilter] = useState<string>(initialUrl.supplierId);
  const [searchQuery, setSearchQuery] = useState(initialUrl.search);
  const [page, setPage] = useState(initialPage.page);
  const [listState, setListState] = useState<ProductsPageResult>(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [forcedSearch, setForcedSearch] = useState<string | undefined>(undefined);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const activeSearch = forcedSearch !== undefined ? forcedSearch : debouncedSearch;

  const skipInitialFetch = useRef(true);
  const cacheSeeded = useRef(false);
  const requestIdRef = useRef(0);
  const inflightRequests = useRef(new Map<string, Promise<ProductsPageResult>>());
  const filterKeyRef = useRef("");
  const heroObservedRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<ProductSearchBarHandle>(null);
  const stickySearchBarRef = useRef<ProductSearchBarHandle>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  const filterKey = `${activeSearch}|${stockFilter}|${categoryFilter}|${supplierFilter}`;

  const hasActiveFilters =
    stockFilter !== "all" ||
    (categoryFilter !== "all" && categoryFilter !== "") ||
    (supplierFilter !== "all" && supplierFilter !== "");

  const activeCategoryName =
    categoryFilter !== "all"
      ? categories.find((cat) => cat.id === categoryFilter)?.name
      : undefined;

  const activeSupplierName =
    supplierFilter !== "all"
      ? suppliers.find((supplier) => supplier.id === supplierFilter)?.name
      : undefined;

  const activeStockLabel = STOCK_FILTERS.find((f) => f.value === stockFilter)?.label;

  const isSearching = searchQuery.trim().length > 0;

  const filterChips = useMemo((): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = [];

    if (isSearching) {
      chips.push({
        id: "search",
        label: `«${searchQuery.trim()}»`,
        onRemove: () => {
          setSearchQuery("");
          setForcedSearch("");
          setPage(1);
        },
      });
    }

    if (supplierFilter !== "all" && activeSupplierName) {
      chips.push({
        id: "supplier",
        label: activeSupplierName,
        onRemove: () => {
          setSupplierFilter("all");
          setPage(1);
        },
      });
    }

    if (categoryFilter !== "all" && activeCategoryName) {
      chips.push({
        id: "category",
        label: activeCategoryName,
        onRemove: () => {
          setCategoryFilter("all");
          setPage(1);
        },
      });
    }

    if (stockFilter !== "all" && activeStockLabel) {
      chips.push({
        id: "stock",
        label: activeStockLabel,
        onRemove: () => {
          setStockFilter("all");
          setPage(1);
        },
      });
    }

    return chips;
  }, [
    isSearching,
    searchQuery,
    supplierFilter,
    activeSupplierName,
    categoryFilter,
    activeCategoryName,
    stockFilter,
    activeStockLabel,
  ]);

  useEffect(() => {
    if (forcedSearch !== undefined && forcedSearch === debouncedSearch) {
      setForcedSearch(undefined);
    }
  }, [debouncedSearch, forcedSearch]);

  useEffect(() => {
    const nextPath = buildProductsListPath({
      search: activeSearch,
      page,
      stockFilter,
      categoryId: categoryFilter,
      supplierId: supplierFilter,
    });
    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "";
    if (currentPath && currentPath !== nextPath) {
      router.replace(nextPath, { scroll: false });
    }
  }, [activeSearch, page, stockFilter, categoryFilter, supplierFilter, router]);

  useEffect(() => {
    if (cacheSeeded.current) return;
    cacheSeeded.current = true;
    productsPageCache.set(
      buildProductsPageCacheKey({
        page: initialPage.page,
        search: initialUrl.search,
        stockFilter: initialUrl.stockFilter,
        categoryId: initialUrl.categoryId,
        supplierId: initialUrl.supplierId,
      }),
      initialPage,
    );
  }, [initialPage, initialUrl]);

  const fetchProductsPage = useCallback(
    async (targetPage: number, search: string) => {
      const cacheKey = buildProductsPageCacheKey({
        page: targetPage,
        search,
        stockFilter,
        categoryId: categoryFilter,
        supplierId: supplierFilter,
      });

      const cached = productsPageCache.get(cacheKey);
      if (cached) return cached;

      const pending = inflightRequests.current.get(cacheKey);
      if (pending) return pending;

      const promise = getProductsPage({
        page: targetPage,
        search,
        stockFilter,
        categoryId: categoryFilter,
        supplierId: supplierFilter,
      })
        .then((result) => {
          productsPageCache.set(cacheKey, result);
          inflightRequests.current.delete(cacheKey);
          return result;
        })
        .catch((error) => {
          inflightRequests.current.delete(cacheKey);
          throw error;
        });

      inflightRequests.current.set(cacheKey, promise);
      return promise;
    },
    [stockFilter, categoryFilter, supplierFilter],
  );

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      if (
        page === initialPage.page &&
        activeSearch === initialUrl.search &&
        stockFilter === initialUrl.stockFilter &&
        categoryFilter === initialUrl.categoryId &&
        supplierFilter === initialUrl.supplierId
      ) {
        filterKeyRef.current = filterKey;
        return;
      }
    }

    const filtersChanged = filterKeyRef.current !== filterKey;
    if (filtersChanged) {
      filterKeyRef.current = filterKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    const reqId = ++requestIdRef.current;
    let cancelled = false;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      const cacheKey = buildProductsPageCacheKey({
        page,
        search: activeSearch,
        stockFilter,
        categoryId: categoryFilter,
        supplierId: supplierFilter,
      });
      const cached = productsPageCache.get(cacheKey);

      if (cached) {
        setListState(cached);
        setIsLoading(false);
        return;
      }

      loadingTimer = setTimeout(() => {
        if (!cancelled && reqId === requestIdRef.current) {
          setIsLoading(true);
        }
      }, LOADING_DELAY_MS);

      try {
        const result = await fetchProductsPage(page, activeSearch);
        if (cancelled || reqId !== requestIdRef.current) return;
        setListState(result);
        setPage(result.page);
      } catch {
        if (!cancelled && reqId === requestIdRef.current) {
          toast.error("No se pudo cargar la lista de productos");
        }
      } finally {
        if (loadingTimer) clearTimeout(loadingTimer);
        if (!cancelled && reqId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadingTimer) clearTimeout(loadingTimer);
    };
  }, [
    page,
    activeSearch,
    filterKey,
    stockFilter,
    categoryFilter,
    supplierFilter,
    initialPage.page,
    initialUrl,
    fetchProductsPage,
  ]);

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    if (page !== 1) setPage(1);
  }

  function handleSearchClear() {
    setSearchQuery("");
    setForcedSearch("");
    setPage(1);
  }

  function handleSearchSubmit() {
    const trimmed = searchQuery.trim();
    setForcedSearch(trimmed);
    setPage(1);
  }

  function handleSupplierSelect(supplierId: string) {
    setSupplierFilter(supplierId);
    setPage(1);
  }

  function clearAllFilters() {
    handleSearchClear();
    setSupplierFilter("all");
    setCategoryFilter("all");
    setStockFilter("all");
  }

  const focusSearch = useCallback(() => {
    if (heroVisible) {
      heroObservedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      searchBarRef.current?.focus();
      return;
    }
    stickySearchBarRef.current?.focus();
  }, [heroVisible]);

  useEffect(() => {
    const node = heroObservedRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setHeroVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) return;
      if (!isProductSearchShortcut(event)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      focusSearch();
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [focusSearch]);

  const loadPage = useCallback(
    async (targetPage: number, options?: { force?: boolean }) => {
      if (options?.force) {
        clearProductsListCache();
        inflightRequests.current.clear();
      }

      const cacheKey = buildProductsPageCacheKey({
        page: targetPage,
        search: activeSearch,
        stockFilter,
        categoryId: categoryFilter,
        supplierId: supplierFilter,
      });

      if (!options?.force) {
        const cached = productsPageCache.get(cacheKey);
        if (cached) {
          setListState(cached);
          setPage(cached.page);
          return;
        }
      }

      setIsLoading(true);
      try {
        const result = await fetchProductsPage(targetPage, activeSearch);
        setListState(result);
        setPage(result.page);
      } catch {
        toast.error("No se pudo cargar la lista de productos");
      } finally {
        setIsLoading(false);
      }
    },
    [activeSearch, stockFilter, categoryFilter, supplierFilter, fetchProductsPage],
  );

  function handleFormSuccess() {
    clearProductsListCache();
    inflightRequests.current.clear();
    router.refresh();
    void loadPage(page, { force: true });
  }

  function openSimulator(product: ProductWithRelations) {
    setProductForSimulator(product);
    setSimulatorOpen(true);
  }

  function openNewProductForm() {
    setProductToEdit(null);
    setFormOpen(true);
  }

  function openEditProductForm(product: ProductWithRelations) {
    setProductToEdit(product);
    setFormOpen(true);
  }

  function openDeleteDialog(product: ProductWithRelations) {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    setIsDeleting(true);
    const result = await deleteProduct(productToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setProductToDelete(null);
    if (result.success) {
      toast.success("Producto eliminado");
      clearProductsListCache();
      inflightRequests.current.clear();
      router.refresh();
      const nextPage =
        listState.products.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      await loadPage(nextPage, { force: true });
    } else {
      toast.error(result.error ?? "Error al eliminar el producto");
    }
  }

  return (
    <>
      <div className="space-y-6">
        <DashboardPageHeader
          icon={Layers}
          title="Lista de Precios"
          description="Consulta precios, proveedores y stock de productos activos."
          actions={
            <Button
              onClick={openNewProductForm}
              className="h-11 gap-2 rounded-xl border-0 bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/25"
            >
              <Package className="size-4" />
              Nuevo Producto
            </Button>
          }
        />

        <div
          className={cn(
            "fixed inset-x-0 top-14 z-20 border-b border-border/70 bg-background/95 px-4 py-2.5 shadow-md backdrop-blur-md transition-all duration-300 motion-reduce:transition-none lg:px-6",
            heroVisible
              ? "pointer-events-none -translate-y-full opacity-0"
              : "translate-y-0 opacity-100",
          )}
          aria-hidden={heroVisible}
        >
          <ProductSearchBar
            ref={stickySearchBarRef}
            variant="sticky"
            value={searchQuery}
            onChange={handleSearchQueryChange}
            onClear={handleSearchClear}
            onSubmit={handleSearchSubmit}
          />
        </div>

        <div ref={heroObservedRef}>
          <ProductsSearchHero
            ref={searchBarRef}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            onSearchClear={handleSearchClear}
            onSearchSubmit={handleSearchSubmit}
            totalCount={listState.totalCount}
            totalPages={listState.totalPages}
            page={listState.page}
            totalRegistered={totalRegistered}
            isLoading={isLoading}
            isSearching={isSearching}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3 dark:bg-muted/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Filtrar
              </span>
            <Select
              value={supplierFilter}
              onValueChange={(value) => {
                setSupplierFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-border/70 bg-background/80 sm:w-[180px]">
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
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-border/70 bg-background/80 sm:w-[160px]">
                <SelectValue placeholder="Categoría" />
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
            <div className="flex flex-wrap gap-1.5">
              {STOCK_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={stockFilter === value ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9 rounded-lg px-3 text-xs",
                    stockFilter === value &&
                      "bg-primary/15 text-primary ring-1 ring-primary/30",
                  )}
                  onClick={() => {
                    setStockFilter(value);
                    setPage(1);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <ProductsFilterChips
            chips={filterChips}
            onClearAll={filterChips.length > 1 ? clearAllFilters : undefined}
          />
        </div>

        <PriceList
          products={listState.products}
          totalCount={listState.totalCount}
          page={listState.page}
          totalPages={listState.totalPages}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchClear={handleSearchClear}
          onPageChange={setPage}
          hasActiveFilters={hasActiveFilters}
          activeCategoryName={activeCategoryName}
          activeSupplierName={activeSupplierName}
          highlightedSupplierId={supplierFilter}
          onSupplierSelect={handleSupplierSelect}
          activeStockLabel={stockFilter !== "all" ? activeStockLabel : undefined}
          totalRegistered={totalRegistered}
          onEdit={openEditProductForm}
          onSimulate={openSimulator}
          onDelete={openDeleteDialog}
        />
      </div>

      <ProductForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setProductToEdit(null);
        }}
        suppliers={suppliers}
        categories={categories}
        onSuccess={handleFormSuccess}
        initialData={productToEdit}
      />

      <PriceSimulatorModal
        open={simulatorOpen}
        onOpenChange={setSimulatorOpen}
        product={productForSimulator}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar &quot;{productToDelete?.name}&quot;? El producto dejará de
              mostrarse en la lista. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
