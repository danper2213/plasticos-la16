import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight, ArrowDownLeft, Package } from "lucide-react";
import { formatCop } from "@/lib/format";
import type { RecentActivityItem } from "@/app/dashboard/_lib/dashboard-data";

interface RecentActivityProps {
  items: RecentActivityItem[];
}

function ActivityIcon({ type }: { type: RecentActivityItem["type"] }) {
  if (type === "payment_out") {
    return (
      <ArrowUpRight className="size-4 shrink-0 text-red-600 dark:text-red-400" />
    );
  }
  if (type === "payment_in") {
    return (
      <ArrowDownLeft className="size-4 shrink-0 text-primary" />
    );
  }
  return (
    <Package className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
  );
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay movimientos registrados hoy.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={`${item.type}-${item.id}`}
          className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
        >
          <ActivityIcon type={item.type} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.description}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {item.amount != null && (
              <p className="text-sm font-medium tabular-nums text-foreground">
                {formatCop(item.amount)}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.date), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
