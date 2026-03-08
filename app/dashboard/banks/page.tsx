import { getBankAccounts, getDailyTransactions, getFinancialCategories } from "./actions";
import { BanksClient } from "./banks-client";

export default async function BanksPage() {
  const [bankAccounts, transactions, categories] = await Promise.all([
    getBankAccounts(),
    getDailyTransactions(),
    getFinancialCategories(),
  ]);

  return (
    <div className="space-y-6">
      <BanksClient
        bankAccounts={bankAccounts}
        transactions={transactions}
        categories={categories}
      />
    </div>
  );
}
