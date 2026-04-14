import {
  getInventoryBatches,
  getInventoryLegacyMovements,
  getProductNameById,
} from "./actions";
import { InventoryClient } from "./inventory-client";

type Props = { searchParams: Promise<{ from?: string; to?: string; product?: string }> };

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const dateFrom = typeof params.from === "string" && params.from ? params.from : undefined;
  const dateTo = typeof params.to === "string" && params.to ? params.to : undefined;
  const productId = typeof params.product === "string" && params.product ? params.product : undefined;

  const filterOpts =
    dateFrom || dateTo || productId ? { dateFrom, dateTo, productId } : undefined;

  const [batches, legacyMovements, filterProductName] = await Promise.all([
    getInventoryBatches(filterOpts),
    getInventoryLegacyMovements(filterOpts),
    productId ? getProductNameById(productId) : Promise.resolve(null),
  ]);

  const productName =
    filterProductName ??
    batches[0]?.lines[0]?.product_name ??
    legacyMovements[0]?.product_name ??
    null;

  return (
    <div className="space-y-6">
      <InventoryClient
        batches={batches}
        legacyMovements={legacyMovements}
        filterFrom={dateFrom}
        filterTo={dateTo}
        filterProductId={productId}
        filterProductName={productName}
      />
    </div>
  );
}
