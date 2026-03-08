import { getProducts, getActiveSuppliers, getCategories } from "./actions";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const [products, suppliers, categories] = await Promise.all([
    getProducts(),
    getActiveSuppliers(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <ProductsClient
        products={products}
        suppliers={suppliers}
        categories={categories}
      />
    </div>
  );
}
