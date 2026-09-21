import {
  parseProductsListUrl,
  toProductsListFilters,
} from "@/lib/products-list-url";
import {
  getActiveProductsCount,
  getActiveSuppliers,
  getCategories,
  getProducts,
  getProductsPage,
} from "./actions";
import { ProductsClient } from "./products-client";

/** Gemini puede tardar más de 15s al leer el PDF de la factura. */
export const maxDuration = 60;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialUrl = parseProductsListUrl(params);

  const [suppliers, categories, totalRegistered, initialPage, initialCatalog] =
    await Promise.all([
      getActiveSuppliers(),
      getCategories(),
      getActiveProductsCount(),
      getProductsPage(toProductsListFilters(initialUrl)),
      getProducts(),
    ]);

  return (
    <div className="space-y-6">
      <ProductsClient
        suppliers={suppliers}
        categories={categories}
        totalRegistered={totalRegistered}
        initialPage={initialPage}
        initialUrl={initialUrl}
        initialCatalog={initialCatalog}
      />
    </div>
  );
}
