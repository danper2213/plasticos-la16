import {
  parseProductsListUrl,
  toProductsListFilters,
} from "@/lib/products-list-url";
import {
  getActiveProductsCount,
  getActiveSuppliers,
  getCategories,
  getProductsPage,
} from "./actions";
import { ProductsClient } from "./products-client";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialUrl = parseProductsListUrl(params);

  const [suppliers, categories, totalRegistered, initialPage] = await Promise.all([
    getActiveSuppliers(),
    getCategories(),
    getActiveProductsCount(),
    getProductsPage(toProductsListFilters(initialUrl)),
  ]);

  return (
    <div className="space-y-6">
      <ProductsClient
        suppliers={suppliers}
        categories={categories}
        totalRegistered={totalRegistered}
        initialPage={initialPage}
        initialUrl={initialUrl}
      />
    </div>
  );
}
