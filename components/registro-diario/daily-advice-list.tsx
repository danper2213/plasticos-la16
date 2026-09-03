"use client";

import { CheckCircle2, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdviceSeverity, DailyAdvice } from "@/app/dashboard/registro-diario/calc";

const SEVERITY_STYLES: Record<
  AdviceSeverity,
  { wrap: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    wrap: "border-emerald-500/30 bg-emerald-500/10",
    icon: "text-emerald-500 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  info: {
    wrap: "border-sky-500/30 bg-sky-500/10",
    icon: "text-sky-500 dark:text-sky-400",
    Icon: Info,
  },
  warning: {
    wrap: "border-amber-500/30 bg-amber-500/10",
    icon: "text-amber-500 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  alert: {
    wrap: "border-red-500/30 bg-red-500/10",
    icon: "text-red-500 dark:text-red-400",
    Icon: AlertCircle,
  },
};

interface DailyAdviceListProps {
  items: DailyAdvice[];
  compact?: boolean;
  className?: string;
}

export function DailyAdviceList({ items, compact = false, className }: DailyAdviceListProps) {
  if (items.length === 0) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => {
        const style = SEVERITY_STYLES[item.severity];
        const Icon = style.Icon;
        return (
          <li
            key={item.id}
            className={cn(
              "flex gap-3 rounded-xl border p-3",
              style.wrap,
              compact && "p-2.5"
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", style.icon)} aria-hidden />
            <div className="min-w-0">
              <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>
                {item.title}
              </p>
              <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                {item.message}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
