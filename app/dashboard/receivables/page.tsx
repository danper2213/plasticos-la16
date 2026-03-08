import { getReceivables, getActiveCustomers, getBankAccounts } from "./actions";
import { ReceivablesClient } from "./receivables-client";

export default async function ReceivablesPage() {
  const [receivables, customers, bankAccounts] = await Promise.all([
    getReceivables(),
    getActiveCustomers(),
    getBankAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <ReceivablesClient
        receivables={receivables}
        customers={customers}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
