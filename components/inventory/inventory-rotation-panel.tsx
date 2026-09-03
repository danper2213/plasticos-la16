"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Package,
  Trophy,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  InventoryPanel,
  InventorySectionHeader,
  inventoryFilterButtonClass,
} from "@/components/inventory/inventory-ui";
import type { ProductRotationReport } from "@/app/dashboard/inventory/actions";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";
import {
  INVENTORY_ROTATION_START,
  isSameYearMonth,
  listRotationMonths,
  rotationMaxMonth,
  rotationMonthLabel,
  shiftRotationMonth,
  type YearMonth,
} from "@/lib/inventory-rotation-period";
import { cn } from "@/lib/utils";

type InventoryRotationPanelProps = {
  report: ProductRotationReport;
  month: number;
  year: number;
  buildMonthHref: (month: number, year: number) => string;
  buildProductHref: (productId: string) => string;
};

function shareLabel(pct: number): string {
  if (pct < 0.1) return "<0,1%";
  return `${pct.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}

function shortName(name: string, max = 18): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function InventoryRotationPanel({
  report,
  month,
  year,
  buildMonthHref,
  buildProductHref,
}: InventoryRotationPanelProps) {
  const reduceMotion = useReducedMotion();
  const selected: YearMonth = { month, year };
  const months = listRotationMonths();
  const minMonth: YearMonth = {
    month: INVENTORY_ROTATION_START.month,
    year: INVENTORY_ROTATION_START.year,
  };
  const maxMonth = rotationMaxMonth();
  const prev = shiftRotationMonth(month, year, -1);
  const next = shiftRotationMonth(month, year, 1);
  const canPrev = !isSameYearMonth(selected, minMonth);
  const canNext = !isSameYearMonth(selected, maxMonth);
  const periodLabel = rotationMonthLabel(month, year);
  const { rows, totalQuantityOut, totalProducts, totalOutEvents } = report;
  const top = rows[0];
  const maxQty = rows[0]?.quantityOut ?? 0;
  const chartRows = rows.slice(0, 8).map((row) => ({
    name: shortName(row.productName),
    fullName: row.productName,
    qty: row.quantityOut,
    label: row.quantityOutLabel,
    share: row.sharePercent,
  }));

  return (
    <InventoryPanel className="overflow-hidden">
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/8 via-muted/20 to-transparent px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <InventorySectionHeader icon={TrendingUp} title="Productos que más rotan" />
            <p className="max-w-xl pl-10 text-xs leading-relaxed text-muted-foreground">
              Ranking del mes según <strong className="font-semibold text-foreground">salidas de bodega</strong>.
              Cada comprobante de salida suma unidades. El que más salió queda arriba.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              disabled={!canPrev}
              asChild={canPrev}
            >
              {canPrev ? (
                <Link href={buildMonthHref(prev.month, prev.year)} aria-label="Mes anterior">
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Link>
              ) : (
                <>
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </>
              )}
            </Button>
            <span className="min-w-[9.5rem] rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-center text-xs font-semibold tabular-nums text-foreground sm:text-sm">
              {periodLabel}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              disabled={!canNext}
              asChild={canNext}
            >
              {canNext ? (
                <Link href={buildMonthHref(next.month, next.year)} aria-label="Mes siguiente">
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <>
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 pl-0 sm:pl-10">
            {months.map((m) => {
              const active = isSameYearMonth(m, selected);
              return (
                <Link
                  key={`${m.year}-${m.month}`}
                  href={buildMonthHref(m.month, m.year)}
                  className={cn(
                    inventoryFilterButtonClass(active),
                    "h-8 px-3 text-xs font-medium",
                    "inline-flex items-center rounded-xl border",
                  )}
                >
                  {m.label.replace(` ${m.year}`, "")}
                </Link>
              );
            })}
          </div>
      </div>

      <div className="grid gap-px bg-border/50 sm:grid-cols-3">
        {[
          {
            icon: ArrowUpRight,
            label: "Salió de bodega",
            value: formatInventoryQuantity(totalQuantityOut),
            hint: `${totalOutEvents} salida${totalOutEvents === 1 ? "" : "s"} en el mes`,
            tone: "text-red-600 dark:text-red-400",
          },
          {
            icon: Package,
            label: "Productos en movimiento",
            value: String(totalProducts),
            hint: totalProducts === 1 ? "Un producto con salidas" : "Con al menos una salida",
            tone: "text-foreground",
          },
          {
            icon: Trophy,
            label: "El que más rotó",
            value: top ? shortName(top.productName, 22) : "—",
            hint: top ? `${top.quantityOutLabel} · ${shareLabel(top.sharePercent)} del mes` : "Sin salidas aún",
            tone: "text-primary",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-background/60 px-4 py-3 sm:px-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <kpi.icon className="size-3.5" aria-hidden />
              {kpi.label}
            </p>
            <p className={cn("mt-1 truncate text-lg font-black tabular-nums sm:text-xl", kpi.tone)}>
              {kpi.value}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-b border-border/60 px-4 py-3 sm:grid-cols-3 sm:px-5">
        {[
          {
            step: "1",
            title: "Registrás una salida",
            text: "Cada comprobante de egreso cuenta para este mes.",
            icon: Warehouse,
          },
          {
            step: "2",
            title: "Se suman las unidades",
            text: "No importa cuántos comprobantes: gana quien más salió.",
            icon: Package,
          },
          {
            step: "3",
            title: "Queda el ranking",
            text: "Arriba, lo que más se mueve. Tocá un producto para verlo en la lista.",
            icon: Trophy,
          },
        ].map((item) => (
          <div
            key={item.step}
            className="flex gap-3 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-black text-primary">
              {item.step}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{item.title}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            En {periodLabel} todavía no hay salidas.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrá un movimiento de salida y el producto aparece acá, ordenado por cantidad.
          </p>
        </div>
      ) : (
        <>
          {chartRows.length > 0 ? (
            <div className="border-b border-border/50 px-2 py-4 sm:px-4">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comparación visual · top {chartRows.length}
              </p>
              <div
                className="w-full"
                style={{ height: Math.max(chartRows.length * 42, 180) }}
              >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartRows}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={92}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const item = payload[0].payload as (typeof chartRows)[number];
                          return (
                            <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                              <p className="font-semibold text-popover-foreground">{item.fullName}</p>
                              <p className="text-muted-foreground">
                                {item.label} · {shareLabel(item.share)} del mes
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="qty"
                        fill="hsl(var(--primary))"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>
          ) : null}

          <ol className="divide-y divide-border/50">
            {rows.map((row, index) => {
              const barPct =
                maxQty > 0 ? Math.max(6, Math.round((row.quantityOut / maxQty) * 100)) : 0;
              return (
                <motion.li
                  key={row.productId}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.04, duration: 0.28 }}
                  className="relative"
                >
                  <Link
                    href={buildProductHref(row.productId)}
                    className="relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.04] sm:items-center sm:px-5 sm:py-3.5"
                  >
                    <motion.div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-primary/[0.07] dark:bg-primary/15"
                      initial={reduceMotion ? { width: `${barPct}%` } : { width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.08 }}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                        index === 0
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                          : index < 3
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="relative z-10 min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{row.productName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {shareLabel(row.sharePercent)} del mes
                        {` · ${row.outEvents} salida${row.outEvents === 1 ? "" : "s"}`}
                        {row.distinctDays > 0
                          ? ` · ${row.distinctDays} día${row.distinctDays === 1 ? "" : "s"}`
                          : ""}
                        {row.packaging ? ` · ${row.packaging}` : ""}
                      </p>
                    </div>
                    <div className="relative z-10 shrink-0 text-right">
                      <p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-foreground">
                        <ArrowUpRight className="size-3.5 text-red-500" aria-hidden />
                        {row.quantityOutLabel}
                      </p>
                      <p className="text-[11px] text-muted-foreground">salió</p>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ol>
        </>
      )}
    </InventoryPanel>
  );
}
