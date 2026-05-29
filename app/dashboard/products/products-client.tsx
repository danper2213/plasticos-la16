"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Package } from "lucide-react";
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
  DashboardToolbar,
  DashboardToolbarStat,
} from "@/components/layout/dashboard-toolbar";
import {
  deleteProduct,
  getProductsPage,
  type ActiveSupplierOption,
  type CategoryOption,
  type ProductWithRelations,
  type ProductsPageResult,
} from "./actions";
import type { ProductsStockFilter } from "./list-types";

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
}

export function ProductsClient({
  suppliers,
  categories,
  totalRegistered,
  initialPage,
}: ProductsClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductWithRelations | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [productForSimulator, setProductForSimulator] = useState<ProductWithRelations | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(initialPage.page);
  const [listState, setListState] = useState<ProductsPageResult>(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const skipInitialFetch = useRef(true);
  const cacheSeeded = useRef(false);
  const requestIdRef = useRef(0);
  const inflightRequests = useRef(new Map<string, Promise<ProductsPageResult>>());
  const filterKeyRef = useRef("");

  const filterKey = `${debouncedSearch}|${stockFilter}|${categoryFilter}`;

  const hasActiveFilters =
    stockFilter !== "all" || (categoryFilter !== "all" && categoryFilter !== "");

  useEffect(() => {
    if (cacheSeeded.current) return;
    cacheSeeded.current = true;
    productsPageCache.set(
      buildProductsPageCacheKey({
        page: initialPage.page,
        search: "",
        stockFilter: "all",
        categoryId: "all",
      }),
      initialPage,
    );
  }, [initialPage]);

  const fetchProductsPage = useCallback(
    async (targetPage: number, search: string) => {
      const cacheKey = buildProductsPageCacheKey({
        page: targetPage,
        search,
        stockFilter,
        categoryId: categoryFilter,
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
    [stockFilter, categoryFilter],
  );

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      if (
        page === initialPage.page &&
        !debouncedSearch &&
        stockFilter === "all" &&
        categoryFilter === "all"
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
        search: debouncedSearch,
        stockFilter,
        categoryId: categoryFilter,
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
        const result = await fetchProductsPage(page, debouncedSearch);
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
    debouncedSearch,
    filterKey,
    stockFilter,
    categoryFilter,
    initialPage.page,
    fetchProductsPage,
  ]);

  const loadPage = useCallback(
    async (targetPage: number, options?: { force?: boolean }) => {
      if (options?.force) {
        clearProductsListCache();
        inflightRequests.current.clear();
      }

      const cacheKey = buildProductsPageCacheKey({
        page: targetPage,
        search: debouncedSearch,
        stockFilter,
        categoryId: categoryFilter,
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
        const result = await fetchProductsPage(targetPage, debouncedSearch);
        setListState(result);
        setPage(result.page);
      } catch {
        toast.error("No se pudo cargar la lista de productos");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, stockFilter, categoryFilter, fetchProductsPage],
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
          description="Productos activos con proveedor y categoría."
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

        <DashboardToolbar className="flex flex-col items-center gap-4 lg:flex-row">
          <div className="flex w-full flex-wrap items-center gap-3 lg:flex-1">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-input bg-background md:w-[200px] focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <SelectValue placeholder="Todas las categorías" />
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
            <div className="flex flex-wrap gap-2">
              {STOCK_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={stockFilter === value ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-lg h-9",
                    stockFilter === value && "bg-primary/15 text-primary ring-1 ring-primary/30",
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
          <div className="hidden h-8 w-px shrink-0 bg-border lg:block" aria-hidden />
          <DashboardToolbarStat>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary dark:bg-primary/15">
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-muted-foreground">
                Total Registrados
              </span>
              <span className="text-xl font-black tabular-nums leading-tight text-foreground">
                {totalRegistered}
              </span>
            </div>
          </DashboardToolbarStat>
        </DashboardToolbar>

        <PriceList
          products={listState.products}
          totalCount={listState.totalCount}
          page={listState.page}
          totalPages={listState.totalPages}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onPageChange={setPage}
          hasActiveFilters={hasActiveFilters}
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
