import type { ProductsListFilters, ProductsStockFilter } from "@/app/dashboard/products/list-types";

const STOCK_VALUES = new Set<ProductsStockFilter>(["all", "no_stock", "with_stock"]);

export type ProductsListUrlState = {
  search: string;
  page: number;
  stockFilter: ProductsStockFilter;
  categoryId: string;
  supplierId: string;
};

export function parseProductsListUrl(
  params: Record<string, string | string[] | undefined>,
): ProductsListUrlState {
  const rawQ = params.q;
  const rawPage = params.page;
  const rawStock = params.stock;
  const rawCategory = params.category;
  const rawSupplier = params.supplier;

  const search = typeof rawQ === "string" ? rawQ.trim() : "";
  const pageNum = typeof rawPage === "string" ? parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;

  const stockCandidate =
    typeof rawStock === "string" ? rawStock : "all";
  const stockFilter = STOCK_VALUES.has(stockCandidate as ProductsStockFilter)
    ? (stockCandidate as ProductsStockFilter)
    : "all";

  const categoryId =
    typeof rawCategory === "string" && rawCategory.trim() !== ""
      ? rawCategory.trim()
      : "all";

  const supplierId =
    typeof rawSupplier === "string" && rawSupplier.trim() !== ""
      ? rawSupplier.trim()
      : "all";

  return { search, page, stockFilter, categoryId, supplierId };
}

export function toProductsListFilters(state: ProductsListUrlState): ProductsListFilters {
  return {
    page: state.page,
    search: state.search || undefined,
    stockFilter: state.stockFilter,
    categoryId: state.categoryId,
    supplierId: state.supplierId,
  };
}

export function buildProductsListPath(state: ProductsListUrlState): string {
  const params = new URLSearchParams();

  if (state.search) params.set("q", state.search);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.stockFilter !== "all") params.set("stock", state.stockFilter);
  if (state.categoryId !== "all") params.set("category", state.categoryId);
  if (state.supplierId !== "all") params.set("supplier", state.supplierId);

  const qs = params.toString();
  return qs ? `/dashboard/products?${qs}` : "/dashboard/products";
}
