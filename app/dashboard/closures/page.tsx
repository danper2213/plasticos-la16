import {
  getClosures,
  getMonthlyPaymentsTotal,
  getMonthlyExpensesByCategory,
} from "./actions";
import { ClosuresClient } from "./closures-client";

export default async function ClosuresPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [closures, monthlyPaymentsTotal, monthlyExpensesByCategory] = await Promise.all([
    getClosures(),
    getMonthlyPaymentsTotal(month, year),
    getMonthlyExpensesByCategory(month, year),
  ]);

  return (
    <div className="space-y-6">
      <ClosuresClient
        closures={closures}
        monthlyPaymentsTotal={monthlyPaymentsTotal}
        monthlyExpensesByCategory={monthlyExpensesByCategory}
        reportMonth={month}
        reportYear={year}
      />
    </div>
  );
}
