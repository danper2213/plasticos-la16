import {
  getSamitClosures,
  getLatestSamitTotalForSuggestion,
} from "./actions";
import { SamitClient } from "./samit-client";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SamitPage({
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

  const [closures, suggestedInitialBalance] = await Promise.all([
    getSamitClosures(safeMonth, safeYear),
    getLatestSamitTotalForSuggestion(),
  ]);

  return (
    <div className="space-y-6">
      <SamitClient
        closures={closures}
        reportMonth={safeMonth}
        reportYear={safeYear}
        suggestedInitialBalance={suggestedInitialBalance}
      />
    </div>
  );
}
