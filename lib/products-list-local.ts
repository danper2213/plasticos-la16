import type { ProductWithRelations } from "@/app/dashboard/products/actions";
import {
  PRODUCTS_PAGE_SIZE,
  type ProductsStockFilter,
} from "@/app/dashboard/products/list-types";
import { searchIntelligent, toSearchProduct } from "@/lib/searchEngine";

export function filterProductsCatalog(
  products: ProductWithRelations[],
  filters: {
    search: string;
    stockFilter: ProductsStockFilter;
    categoryId: string;
    supplierId: string;
  },
): ProductWithRelations[] {
  let items = products;

  if (filters.stockFilter === "no_stock") {
    items = items.filter(
      (product) => product.stock_quantity == null || product.stock_quantity === 0,
    );
  } else if (filters.stockFilter === "with_stock") {
    items = items.filter(
      (product) => product.stock_quantity != null && product.stock_quantity > 0,
    );
  }

  if (filters.categoryId && filters.categoryId !== "all") {
    items = items.filter((product) => product.category_id === filters.categoryId);
  }

  if (filters.supplierId && filters.supplierId !== "all") {
    items = items.filter((product) => product.supplier_id === filters.supplierId);
  }

  const search = filters.search.trim();
  if (!search) {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  const ranked = searchIntelligent(
    search,
    items.map((product) =>
      toSearchProduct({
        id: product.id,
        name: product.name,
        scan_code: product.scan_code,
        category_name: product.category_name,
        presentation: product.presentation,
        packaging: product.packaging,
        selling_price: product.selling_price,
        cost: product.cost,
      }),
    ),
  );
  const byId = new Map(items.map((product) => [product.id, product]));
  return ranked
    .map((row) => byId.get(row.id))
    .filter((product): product is ProductWithRelations => product != null);
}

export function paginateProductsCatalog(
  products: ProductWithRelations[],
  page: number,
  pageSize = PRODUCTS_PAGE_SIZE,
): {
  products: ProductWithRelations[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const totalCount = products.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize;
  return {
    products: products.slice(from, from + pageSize),
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
}
