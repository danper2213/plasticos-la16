import { getPayables, getActiveSuppliers, getBankAccounts } from "./actions";
import { PayablesClient } from "./payables-client";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const now = new Date();
  const monthParam = params?.month;
  const yearParam = params?.year;

  const month = monthParam
    ? parseInt(String(monthParam), 10)
    : now.getMonth() + 1;
  const year = yearParam ? parseInt(String(yearParam), 10) : now.getFullYear();

  const safeMonth = Math.min(12, Math.max(1, month));
  const safeYear = year > 0 ? year : now.getFullYear();

  const [payables, suppliers, bankAccounts] = await Promise.all([
    getPayables(safeMonth, safeYear),
    getActiveSuppliers(),
    getBankAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <PayablesClient
        payables={payables}
        suppliers={suppliers}
        bankAccounts={bankAccounts}
        month={safeMonth}
        year={safeYear}
      />
    </div>
  );
}
