import {
  getDailyRegisters,
  getLatestEndingBalanceForSuggestion,
} from "./actions";
import { RegistroDiarioClient } from "./registro-diario-client";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RegistroDiarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const now = new Date();
  const monthParam = params?.month;
  const yearParam = params?.year;

  const month = monthParam ? parseInt(String(monthParam), 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(String(yearParam), 10) : now.getFullYear();

  const safeMonth = Math.min(12, Math.max(1, month));
  const safeYear = year > 0 ? year : now.getFullYear();

  const [registers, suggestedPreviousBalance] = await Promise.all([
    getDailyRegisters(safeMonth, safeYear),
    getLatestEndingBalanceForSuggestion(),
  ]);

  return (
    <div className="space-y-6">
      <RegistroDiarioClient
        registers={registers}
        reportMonth={safeMonth}
        reportYear={safeYear}
        suggestedPreviousBalance={suggestedPreviousBalance}
      />
    </div>
  );
}
