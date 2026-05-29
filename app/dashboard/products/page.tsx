import {
  getActiveProductsCount,
  getActiveSuppliers,
  getCategories,
  getProductsPage,
} from "./actions";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const [suppliers, categories, totalRegistered, initialPage] = await Promise.all([
    getActiveSuppliers(),
    getCategories(),
    getActiveProductsCount(),
    getProductsPage({ page: 1 }),
  ]);

  return (
    <div className="space-y-6">
      <ProductsClient
        suppliers={suppliers}
        categories={categories}
        totalRegistered={totalRegistered}
        initialPage={initialPage}
      />
    </div>
  );
}
