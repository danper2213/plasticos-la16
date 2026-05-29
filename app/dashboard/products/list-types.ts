export const PRODUCTS_PAGE_SIZE = 24;

export type ProductsStockFilter = "all" | "no_stock" | "with_stock";

export type ProductsListFilters = {
  page?: number;
  search?: string;
  stockFilter?: ProductsStockFilter;
  categoryId?: string;
};
