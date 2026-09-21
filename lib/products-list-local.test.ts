import { describe, expect, it } from "vitest";
import type { ProductWithRelations } from "@/app/dashboard/products/actions";
import {
  filterProductsCatalog,
  paginateProductsCatalog,
} from "@/lib/products-list-local";

function product(
  patch: Partial<ProductWithRelations> & Pick<ProductWithRelations, "id" | "name">,
): ProductWithRelations {
  return {
    presentation: "",
    packaging: null,
    cost: 0,
    selling_price: 0,
    stock_quantity: 1,
    is_active: true,
    supplier_id: "sup-a",
    category_id: "cat-a",
    image_url: null,
    featured_on_landing: false,
    featured_sort_order: 0,
    scan_code: "",
    supplier_name: "Proveedor A",
    category_name: "Descartables",
    ...patch,
  };
}

describe("filterProductsCatalog", () => {
  const catalog = [
    product({ id: "1", name: "Vaso 12 oz", stock_quantity: 10 }),
    product({ id: "2", name: "Bandeja #7", stock_quantity: 0, category_id: "cat-b" }),
    product({ id: "3", name: "Film stretch 500", supplier_id: "sup-b" }),
  ];

  it("filtra por texto al instante y prioriza el nombre", () => {
    const hits = filterProductsCatalog(catalog, {
      search: "vaso",
      stockFilter: "all",
      categoryId: "all",
      supplierId: "all",
    });
    expect(hits.map((p) => p.id)).toEqual(["1"]);
  });

  it("aplica filtro de stock y categoría", () => {
    const hits = filterProductsCatalog(catalog, {
      search: "",
      stockFilter: "no_stock",
      categoryId: "cat-b",
      supplierId: "all",
    });
    expect(hits.map((p) => p.id)).toEqual(["2"]);
  });
});

describe("paginateProductsCatalog", () => {
  it("parte el catálogo en páginas", () => {
    const items = Array.from({ length: 30 }, (_, i) =>
      product({ id: String(i), name: `P ${i}` }),
    );
    const page2 = paginateProductsCatalog(items, 2, 24);
    expect(page2.page).toBe(2);
    expect(page2.totalPages).toBe(2);
    expect(page2.products).toHaveLength(6);
  });
});
