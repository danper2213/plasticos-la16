"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SamitForm } from "@/components/samit/samit-form";
import { formatCop } from "@/lib/format";
import { deleteSamitClosure, type SamitClosure } from "./actions";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";
import { endOfMonth, getISODay, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

/** Fila analítica diaria (estructura unificada para UI y gráficos). */
export interface SamitDayAnalytics {
  fecha: string;
  saldoInicial: number;
  ventaSistema: number;
  pagos: number;
  total: number;
}

function closureDateKey(closure_date: string): string {
  return closure_date.slice(0, 10);
}

function closureToAnalytics(c: SamitClosure): SamitDayAnalytics {
  return {
    fecha: closureDateKey(c.closure_date),
    saldoInicial: c.initial_balance,
    ventaSistema: c.sales_total,
    pagos: c.payments_total,
    total: c.total,
  };
}

function buildClosureMap(closures: SamitClosure[]): Map<string, SamitClosure> {
  const sorted = [...closures].sort((a, b) =>
    closureDateKey(a.closure_date).localeCompare(closureDateKey(b.closure_date))
  );
  const m = new Map<string, SamitClosure>();
  for (const c of sorted) {
    m.set(closureDateKey(c.closure_date), c);
  }
  return m;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function compactAxisCop(v: number): string {
  return new Intl.NumberFormat("es-CO", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(v);
}

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const CHART_COLORS = {
  ventas: "#34d399",
  pagos: "#f87171",
} as const;

interface SamitClientProps {
  closures: SamitClosure[];
  reportMonth: number;
  reportYear: number;
  suggestedInitialBalance: number;
}

export function SamitClient({
  closures,
  reportMonth,
  reportYear,
  suggestedInitialBalance,
}: SamitClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedClosure, setSelectedClosure] = React.useState<SamitClosure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [closureToDelete, setClosureToDelete] = React.useState<SamitClosure | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const closureMap = React.useMemo(() => buildClosureMap(closures), [closures]);

  const monthStart = React.useMemo(
    () => startOfMonth(new Date(reportYear, reportMonth - 1, 1)),
    [reportMonth, reportYear]
  );
  const lastDay = React.useMemo(
    () => endOfMonth(monthStart).getDate(),
    [monthStart]
  );

  const kpis = React.useMemo(() => {
    let totalVentas = 0;
    let totalPagos = 0;
    for (const c of closures) {
      totalVentas += c.sales_total;
      totalPagos += c.payments_total;
    }
    const sortedAsc = [...closures].sort((a, b) =>
      closureDateKey(a.closure_date).localeCompare(closureDateKey(b.closure_date))
    );
    const last = sortedAsc[sortedAsc.length - 1];
    const saldoFinalProyectado = last?.total ?? 0;
    return { totalVentas, totalPagos, saldoFinalProyectado };
  }, [closures]);

  const chartData = React.useMemo(() => {
    const rows: { dia: number; ventas: number; pagos: number }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const key = ymd(reportYear, reportMonth, d);
      const c = closureMap.get(key);
      rows.push({
        dia: d,
        ventas: c?.sales_total ?? 0,
        pagos: c?.payments_total ?? 0,
      });
    }
    return rows;
  }, [closureMap, lastDay, reportMonth, reportYear]);

  const calendarCells = React.useMemo(() => {
    const leading = getISODay(monthStart) - 1;
    const cells: Array<{ type: "blank" } | { type: "day"; day: number; key: string }> = [];
    for (let i = 0; i < leading; i++) cells.push({ type: "blank" });
    for (let d = 1; d <= lastDay; d++) {
      cells.push({ type: "day", day: d, key: ymd(reportYear, reportMonth, d) });
    }
    const total = cells.length;
    const trailing = (7 - (total % 7)) % 7;
    for (let i = 0; i < trailing; i++) cells.push({ type: "blank" });
    return cells;
  }, [lastDay, monthStart, reportMonth, reportYear]);

  function handleFormSuccess() {
    router.refresh();
  }

  function openDayDetail(c: SamitClosure) {
    setSelectedClosure(c);
    setDetailOpen(true);
  }

  function openDeleteFromSheet() {
    if (!selectedClosure) return;
    setClosureToDelete(selectedClosure);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!closureToDelete) return;
    setIsDeleting(true);
    const result = await deleteSamitClosure(closureToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setClosureToDelete(null);
    if (result.success) {
      toast.success("Registro eliminado correctamente");
      setDetailOpen(false);
      setSelectedClosure(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar");
    }
  }

  const selectedAnalytics = selectedClosure ? closureToAnalytics(selectedClosure) : null;

  return (
    <div
      className={cn(
        "space-y-6 rounded-2xl border border-slate-800/90 bg-slate-950 p-4 shadow-2xl sm:p-6",
        "text-slate-100"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">SAMIT</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Total = Saldo inicial + Venta sistema − Pagos. El total arrastra al día siguiente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-slate-800" />}>
            <MonthPaginator basePath="/dashboard/closures/samit" />
          </Suspense>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            + Registrar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total ventas del mes</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-emerald-400">
              {formatCop(kpis.totalVentas)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Suma de venta sistema</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total pagos del mes</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-orange-400">
              {formatCop(kpis.totalPagos)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Suma de pagos registrados</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Saldo final proyectado</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-slate-100">
              {closures.length === 0 ? "—" : formatCop(kpis.saldoFinalProyectado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Total del último día con registro</CardContent>
        </Card>
      </div>

      <Card className="border-slate-800/80 bg-slate-900/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Ventas vs pagos por día</CardTitle>
          <CardDescription className="text-slate-400">
            Comparación diaria en el mes seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-0 pr-2 pt-0 sm:pl-2">
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barGap={2}
                barCategoryGap="12%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis
                  dataKey="dia"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#475569" }}
                  interval={lastDay > 20 ? 2 : 0}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#475569" }}
                  tickFormatter={compactAxisCop}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  labelFormatter={(dia) => `Día ${dia}`}
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    const label =
                      name === "ventas" || name === "Ventas" ? "Ventas" : "Pagos";
                    return [formatCop(n), label];
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#94a3b8", fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar dataKey="ventas" name="Ventas" fill={CHART_COLORS.ventas} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pagos" name="Pagos" fill={CHART_COLORS.pagos} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Calendario del mes</h2>
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="min-w-[640px] px-1">
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS_ES.map((w) => (
                <div
                  key={w}
                  className="pb-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  {w}
                </div>
              ))}
              {calendarCells.map((cell, idx) => {
                if (cell.type === "blank") {
                  return <div key={`b-${idx}`} className="min-h-[88px] rounded-lg bg-transparent" />;
                }
                const c = closureMap.get(cell.key);
                const hasData = Boolean(c);
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!hasData}
                    onClick={() => c && openDayDetail(c)}
                    className={cn(
                      "flex min-h-[88px] flex-col rounded-lg border p-2 text-left transition-colors",
                      hasData
                        ? "border-slate-700/80 bg-slate-800/90 hover:border-slate-500 hover:bg-slate-800 cursor-pointer"
                        : "border-slate-800/50 bg-slate-950/50 opacity-50 cursor-default"
                    )}
                  >
                    <span className="text-xs font-medium text-slate-400">{cell.day}</span>
                    {hasData && c ? (
                      <span className="flex flex-1 items-center justify-center text-center text-base font-semibold tabular-nums text-slate-50 sm:text-lg">
                        {formatCop(c.total)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <SamitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        suggestedInitialBalance={suggestedInitialBalance}
      />

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedClosure(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="text-slate-50">Detalle del día</SheetTitle>
            <SheetDescription className="text-slate-400">
              {selectedAnalytics
                ? formatDateOnlyEsCO(selectedAnalytics.fecha)
                : "Seleccione un día con registro"}
            </SheetDescription>
          </SheetHeader>
          {selectedAnalytics && selectedClosure ? (
            <div className="mt-8 space-y-6">
              <dl className="space-y-4">
                {(
                  [
                    ["Saldo inicial", formatCop(selectedAnalytics.saldoInicial)],
                    ["Venta sistema", formatCop(selectedAnalytics.ventaSistema)],
                    ["Pagos", formatCop(selectedAnalytics.pagos)],
                    ["Total", formatCop(selectedAnalytics.total)],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3"
                  >
                    <dt className="text-sm text-slate-400">{label}</dt>
                    <dd className="text-right text-sm font-medium tabular-nums text-slate-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-900/50 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                onClick={openDeleteFromSheet}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Eliminar registro
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el registro del{" "}
              {closureToDelete ? formatDateOnlyEsCO(closureToDelete.closure_date) : ""}? Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
