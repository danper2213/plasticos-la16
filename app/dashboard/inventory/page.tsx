import {
  getInventoryBatches,
  getInventoryLegacyMovements,
  getProductNameById,
  getProductRotationReport,
  purgeExpiredInventoryReceipts,
} from "./actions";
import { InventoryClient } from "./inventory-client";
import {
  clampRotationMonth,
  currentYearMonthColombia,
  rotationMonthRange,
} from "@/lib/inventory-rotation-period";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    product?: string;
    month?: string;
    year?: string;
    page?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const dateFrom = typeof params.from === "string" && params.from ? params.from : undefined;
  const dateTo = typeof params.to === "string" && params.to ? params.to : undefined;
  const productId = typeof params.product === "string" && params.product ? params.product : undefined;
  const requestedPage = params.page ? parseInt(String(params.page), 10) : 1;
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const requestedMonth = params.month ? parseInt(String(params.month), 10) : NaN;
  const requestedYear = params.year ? parseInt(String(params.year), 10) : NaN;
  const current = currentYearMonthColombia();
  const rotationPeriod = clampRotationMonth(
    Number.isFinite(requestedMonth) ? requestedMonth : current.month,
    Number.isFinite(requestedYear) ? requestedYear : current.year,
  );
  const { dateFrom: rotationFrom, dateTo: rotationTo } = rotationMonthRange(
    rotationPeriod.month,
    rotationPeriod.year,
  );

  const filterOpts =
    dateFrom || dateTo || productId ? { dateFrom, dateTo, productId } : undefined;

  await purgeExpiredInventoryReceipts();

  const [batchesPage, legacyMovements, filterProductName, rotationReport] = await Promise.all([
    getInventoryBatches({ ...filterOpts, page }),
    getInventoryLegacyMovements(filterOpts),
    productId ? getProductNameById(productId) : Promise.resolve(null),
    getProductRotationReport({ dateFrom: rotationFrom, dateTo: rotationTo, limit: 12 }),
  ]);

  const productName =
    filterProductName ??
    batchesPage.batches[0]?.lines[0]?.product_name ??
    legacyMovements[0]?.product_name ??
    null;

  return (
    <div className="space-y-6">
      <InventoryClient
        batches={batchesPage.batches}
        batchesTotalCount={batchesPage.totalCount}
        batchesPage={batchesPage.page}
        batchesTotalPages={batchesPage.totalPages}
        legacyMovements={legacyMovements}
        filterFrom={dateFrom}
        filterTo={dateTo}
        filterProductId={productId}
        filterProductName={productName}
        rotationReport={rotationReport}
        rotationMonth={rotationPeriod.month}
        rotationYear={rotationPeriod.year}
      />
    </div>
  );
}
