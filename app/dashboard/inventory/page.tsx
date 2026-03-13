import { getInventoryMovements, getProductNameById } from "./actions";
import { InventoryClient } from "./inventory-client";

type Props = { searchParams: Promise<{ from?: string; to?: string; product?: string }> };

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const dateFrom = typeof params.from === "string" && params.from ? params.from : undefined;
  const dateTo = typeof params.to === "string" && params.to ? params.to : undefined;
  const productId = typeof params.product === "string" && params.product ? params.product : undefined;

  const [movements, filterProductName] = await Promise.all([
    getInventoryMovements(
      dateFrom || dateTo || productId
        ? { dateFrom, dateTo, productId }
        : undefined
    ),
    productId ? getProductNameById(productId) : Promise.resolve(null),
  ]);

  const productName =
    filterProductName ?? (movements.length > 0 ? movements[0].product_name : null);

  return (
    <div className="space-y-6">
      <InventoryClient
        movements={movements}
        filterFrom={dateFrom}
        filterTo={dateTo}
        filterProductId={productId}
        filterProductName={productName}
      />
    </div>
  );
}
