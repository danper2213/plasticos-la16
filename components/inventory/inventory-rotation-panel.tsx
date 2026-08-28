"use client";

import { TrendingUp, ArrowUpRight } from "lucide-react";
import {
  InventoryPanel,
  InventorySectionHeader,
} from "@/components/inventory/inventory-ui";
import type { ProductRotationRow } from "@/app/dashboard/inventory/actions";
import { cn } from "@/lib/utils";

type InventoryRotationPanelProps = {
  rows: ProductRotationRow[];
  periodLabel: string;
};

export function InventoryRotationPanel({
  rows,
  periodLabel,
}: InventoryRotationPanelProps) {
  const maxQty = rows[0]?.quantityOut ?? 0;

  return (
    <InventoryPanel className="overflow-hidden">
      <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5 space-y-1">
        <InventorySectionHeader
          icon={TrendingUp}
          title="Productos que más rotan"
        />
        <p className="pl-10 text-xs text-muted-foreground">
          Salidas acumuladas · {periodLabel}. Cada registro de salida alimenta
          este ranking.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Aún no hay salidas en este período. Registrá movimientos de salida
          para ver la rotación de bodega.
        </div>
      ) : (
        <ol className="divide-y divide-border/50">
          {rows.map((row, index) => {
            const barPct =
              maxQty > 0
                ? Math.max(4, Math.round((row.quantityOut / maxQty) * 100))
                : 0;
            return (
              <li
                key={row.productId}
                className="relative px-4 py-3 sm:px-5 sm:py-3.5"
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-primary/[0.06] dark:bg-primary/10"
                  style={{ width: `${barPct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-start gap-3 sm:items-center">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                      index === 0
                        ? "bg-primary text-primary-foreground"
                        : index < 3
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {row.productName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.outEvents} salida{row.outEvents === 1 ? "" : "s"}
                      {row.distinctDays > 0
                        ? ` · ${row.distinctDays} día${row.distinctDays === 1 ? "" : "s"}`
                        : ""}
                      {row.packaging ? ` · ${row.packaging}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-foreground">
                      <ArrowUpRight
                        className="size-3.5 text-red-500"
                        aria-hidden
                      />
                      {row.quantityOutLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground">salió</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </InventoryPanel>
  );
}
