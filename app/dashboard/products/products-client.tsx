"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ProductsListUrlState,
} from "@/lib/products-list-url";
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
import { InvoiceCostUpdateModal } from "@/components/products/invoice-cost-update-modal";
import { PriceSimulatorModal } from "@/components/products/price-simulator-modal";
import { PriceList } from "@/components/products/price-list";
import {
  ProductSearchBar,
} from "@/components/products/product-search-bar";
import type { ActiveFilterChip } from "@/components/products/products-filter-chips";
import { ProductsListFilterDialog } from "@/components/products/products-list-filter-dialog";
import { ProductsSearchHero } from "@/components/products/products-search-hero";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  buildProductsPageCacheKey,
  clearProductsListCache,
  productsPageCache,
} from "@/lib/products-list-cache";
import { DashboardStickySearch } from "@/components/layout/dashboard-sticky-search";
import { useDashboardSearchFocus } from "@/hooks/use-dashboard-search-focus";
import { useProductsListUrlSync } from "@/hooks/use-products-list-url-sync";
import {
  deleteProduct,
  getProductsPage,
  type ActiveSupplierOption,
  type CategoryOption,
  type ProductWithRelations,
  type ProductsPageResult,
} from "./actions";
import type { ProductsStockFilter } from "./list-types";
import { logProductsSearch } from "@/lib/products-search-debug";

type StockFilter = ProductsStockFilter;

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
  const [listFilterOpen, setListFilterOpen] = useState(false);
  const [invoiceCostOpen, setInvoiceCostOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const activeSearchRaw = forcedSearch !== undefined ? forcedSearch : debouncedSearch;
  const activeSearch = activeSearchRaw.trim();

  const skipInitialFetch = useRef(true);
  const cacheSeeded = useRef(false);
  const requestIdRef = useRef(0);
  const inflightRequests = useRef(new Map<string, Promise<ProductsPageResult>>());
  const filterKeyRef = useRef("");
  const {
    heroObservedRef,
    searchBarRef,
    stickySearchBarRef,
    heroVisible,
  } = useDashboardSearchFocus();

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

  const activeStockLabel =
    stockFilter === "no_stock"
      ? "Sin stock"
      : stockFilter === "with_stock"
        ? "Con stock"
        : undefined;

  const listFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (supplierFilter !== "all" && activeSupplierName) parts.push(activeSupplierName);
    if (categoryFilter !== "all" && activeCategoryName) parts.push(activeCategoryName);
    if (stockFilter !== "all" && activeStockLabel) parts.push(activeStockLabel);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0]!;
    return `${parts.length} filtros`;
  }, [
    supplierFilter,
    activeSupplierName,
    categoryFilter,
    activeCategoryName,
    stockFilter,
    activeStockLabel,
  ]);

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
    if (forcedSearch !== undefined && forcedSearch.trim() === debouncedSearch.trim()) {
      logProductsSearch("forcedSearch cleared (debounce caught up)", {
        forcedSearch,
        debouncedSearch,
      });
      setForcedSearch(undefined);
    }
  }, [debouncedSearch, forcedSearch]);

  useProductsListUrlSync({
    search: activeSearch,
    page,
    stockFilter,
    categoryId: categoryFilter,
    supplierId: supplierFilter,
  });

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

    logProductsSearch("fetch scheduled", {
      reqId,
      page,
      activeSearch,
      filterKey,
      filtersChanged,
      searchQuery,
      debouncedSearch,
      forcedSearch,
    });

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
        logProductsSearch("fetch cache hit", { reqId, cacheKey, totalCount: cached.totalCount });
        setListState(cached);
        setIsLoading(false);
        return;
      }

      logProductsSearch("fetch start (server action)", { reqId, cacheKey });

      loadingTimer = setTimeout(() => {
        if (!cancelled && reqId === requestIdRef.current) {
          setIsLoading(true);
        }
      }, LOADING_DELAY_MS);

      try {
        const result = await fetchProductsPage(page, activeSearch);
        if (cancelled || reqId !== requestIdRef.current) {
          logProductsSearch("fetch stale (ignored)", {
            reqId,
            currentReqId: requestIdRef.current,
            cancelled,
          });
          return;
        }
        logProductsSearch("fetch done", {
          reqId,
          totalCount: result.totalCount,
          page: result.page,
          products: result.products.length,
        });
        setListState(result);
        setPage(result.page);
      } catch (error) {
        if (!cancelled && reqId === requestIdRef.current) {
          logProductsSearch("fetch error", { reqId, error });
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
    logProductsSearch("input change", { value, length: value.length });
    setSearchQuery(value);
    if (page !== 1) setPage(1);
  }

  function handleSearchClear() {
    logProductsSearch("clear");
    setSearchQuery("");
    setForcedSearch("");
    setPage(1);
  }

  function handleSearchSubmit() {
    const trimmed = searchQuery.trim();
    logProductsSearch("submit (Enter / chip)", { trimmed, bypassDebounce: true });
    setForcedSearch(trimmed);
    setPage(1);
  }

  function handleSupplierSelect(supplierId: string) {
    setSupplierFilter(supplierId);
    setPage(1);
  }

  function clearListFilters() {
    setSupplierFilter("all");
    setCategoryFilter("all");
    setStockFilter("all");
    setPage(1);
  }

  function clearAllFilters() {
    handleSearchClear();
    setSupplierFilter("all");
    setCategoryFilter("all");
    setStockFilter("all");
  }

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
        <DashboardStickySearch visible={!heroVisible}>
          <ProductSearchBar
            ref={stickySearchBarRef}
            variant="sticky"
            value={searchQuery}
            onChange={handleSearchQueryChange}
            onClear={handleSearchClear}
            onSubmit={handleSearchSubmit}
          />
        </DashboardStickySearch>

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
            onOpenListFilters={() => setListFilterOpen(true)}
            hasListFilters={hasActiveFilters}
            listFilterLabel={listFilterSummary}
            filterChips={filterChips}
            onClearAllFilters={
              filterChips.length > 1 ? clearAllFilters : undefined
            }
            onNewProduct={openNewProductForm}
            onUpdateCostsFromInvoice={() => setInvoiceCostOpen(true)}
          />
        </div>

        <ProductsListFilterDialog
          open={listFilterOpen}
          onOpenChange={setListFilterOpen}
          suppliers={suppliers}
          categories={categories}
          supplierFilter={supplierFilter}
          categoryFilter={categoryFilter}
          stockFilter={stockFilter}
          onSupplierChange={(value) => {
            setSupplierFilter(value);
            setPage(1);
          }}
          onCategoryChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
          onStockChange={(value) => {
            setStockFilter(value);
            setPage(1);
          }}
          onClearListFilters={clearListFilters}
          hasListFilters={hasActiveFilters}
        />

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

      <InvoiceCostUpdateModal
        open={invoiceCostOpen}
        onOpenChange={setInvoiceCostOpen}
        suppliers={suppliers}
        onSuccess={handleFormSuccess}
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
