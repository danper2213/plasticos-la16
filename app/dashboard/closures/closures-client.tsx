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
import { ClosureForm } from "@/components/closures/closure-form";
import { formatCop } from "@/lib/format";
import {
  closureSchema,
  expenseCategoryLabel,
  type ClosureFormValues,
  type ExpenseCategory,
} from "@/app/dashboard/closures/schema";
import {
  deleteClosure,
  getClosureForEdit,
  type Closure,
  type MonthlyExpenseByCategory,
} from "./actions";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";
import { endOfMonth, getISODay, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

/** Vista analítica diaria (cierre de caja). */
export interface ClosureDayAnalytics {
  fecha: string;
  saldoInicial: number;
  ventaEfectivo: number;
  entradasTransferencia: number;
  gastosDelDia: number;
  saldoTotal: number;
}

function closureDateKey(closure_date: string): string {
  return closure_date.slice(0, 10);
}

function closureToAnalytics(c: Closure): ClosureDayAnalytics {
  return {
    fecha: closureDateKey(c.closure_date),
    saldoInicial: c.initial_balance,
    ventaEfectivo: c.sales_total ?? 0,
    entradasTransferencia: c.system_total_income,
    gastosDelDia: c.system_total_expense,
    saldoTotal: c.system_expected_balance,
  };
}

function buildClosureMap(closures: Closure[]): Map<string, Closure> {
  const sorted = [...closures].sort((a, b) =>
    closureDateKey(a.closure_date).localeCompare(closureDateKey(b.closure_date))
  );
  const m = new Map<string, Closure>();
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
  ventaEfectivo: "#34d399",
  gastos: "#f87171",
} as const;

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface ClosuresClientProps {
  closures: Closure[];
  monthlyExpensesByCategory: MonthlyExpenseByCategory[];
  reportMonth: number;
  reportYear: number;
  suggestedInitialBalance: number;
}

export function ClosuresClient({
  closures,
  monthlyExpensesByCategory,
  reportMonth,
  reportYear,
  suggestedInitialBalance,
}: ClosuresClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingClosureId, setEditingClosureId] = React.useState<string | null>(null);
  const [editingInitialValues, setEditingInitialValues] = React.useState<ClosureFormValues | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedClosure, setSelectedClosure] = React.useState<Closure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [closureToDelete, setClosureToDelete] = React.useState<Closure | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const closureMap = React.useMemo(() => buildClosureMap(closures), [closures]);

  const monthStart = React.useMemo(
    () => startOfMonth(new Date(reportYear, reportMonth - 1, 1)),
    [reportMonth, reportYear]
  );
  const lastDay = React.useMemo(() => endOfMonth(monthStart).getDate(), [monthStart]);

  const monthName = MONTH_NAMES[reportMonth - 1];

  const kpis = React.useMemo(() => {
    let totalVentaEfectivo = 0;
    let totalGastos = 0;
    for (const c of closures) {
      totalVentaEfectivo += c.sales_total ?? 0;
      totalGastos += c.system_total_expense;
    }
    const sortedAsc = [...closures].sort((a, b) =>
      closureDateKey(a.closure_date).localeCompare(closureDateKey(b.closure_date))
    );
    const last = sortedAsc[sortedAsc.length - 1];
    const saldoProyectado = last?.system_expected_balance ?? 0;
    return { totalVentaEfectivo, totalGastos, saldoProyectado };
  }, [closures]);

  const chartData = React.useMemo(() => {
    const rows: { dia: number; ventaEfectivo: number; gastos: number }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const key = ymd(reportYear, reportMonth, d);
      const c = closureMap.get(key);
      rows.push({
        dia: d,
        ventaEfectivo: c?.sales_total ?? 0,
        gastos: c?.system_total_expense ?? 0,
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
    setEditingClosureId(null);
    setEditingInitialValues(null);
  }

  function openCreateDialog() {
    setEditingClosureId(null);
    setEditingInitialValues(null);
    setFormOpen(true);
  }

  async function loadClosureIntoForm(row: Closure) {
    setIsLoadingEdit(true);
    const result = await getClosureForEdit(row.id);
    setIsLoadingEdit(false);
    if (!result.success) {
      toast.error(result.error ?? "No se pudo cargar el cierre para edición");
      return false;
    }

    const parsed = closureSchema.safeParse({
      closure_date: result.data.closure_date,
      initial_balance: result.data.initial_balance,
      sales_total: result.data.sales_total,
      system_total_income: result.data.system_total_income,
      expenses: result.data.expenses,
    });
    if (!parsed.success) {
      toast.error("El cierre tiene datos inválidos para edición.");
      return false;
    }

    setEditingClosureId(row.id);
    setEditingInitialValues(parsed.data);
    setFormOpen(true);
    return true;
  }

  async function openEditFromSheet() {
    if (!selectedClosure) return;
    const ok = await loadClosureIntoForm(selectedClosure);
    if (ok) {
      setDetailOpen(false);
      setSelectedClosure(null);
    }
  }

  function openDayDetail(c: Closure) {
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
    const result = await deleteClosure(closureToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setClosureToDelete(null);
    if (result.success) {
      toast.success("Cierre eliminado correctamente");
      setDetailOpen(false);
      setSelectedClosure(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el cierre");
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Cierres de Caja</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Saldo a arrastrar = Saldo inicial + Venta en efectivo + Entradas por transferencia − Gastos
            del día. Ese valor es el saldo inicial del día siguiente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-slate-800" />}>
            <MonthPaginator basePath="/dashboard/closures" />
          </Suspense>
          <Button
            onClick={openCreateDialog}
            className="bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            + Registrar Cierre
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total venta efectivo</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-emerald-400">
              {formatCop(kpis.totalVentaEfectivo)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Suma del mes seleccionado</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total gastos del mes</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-orange-400">
              {formatCop(kpis.totalGastos)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Gastos registrados por día</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Saldo a arrastrar proyectado</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-slate-100">
              {closures.length === 0 ? "—" : formatCop(kpis.saldoProyectado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Saldo total del último día con registro</CardContent>
        </Card>
      </div>

      <Card className="border-slate-800/80 bg-slate-900/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Venta efectivo vs gastos por día</CardTitle>
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
                      name === "ventaEfectivo" || name === "Venta efectivo"
                        ? "Venta efectivo"
                        : "Gastos";
                    return [formatCop(n), label];
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#94a3b8", fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar
                  dataKey="ventaEfectivo"
                  name="Venta efectivo"
                  fill={CHART_COLORS.ventaEfectivo}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="gastos" name="Gastos" fill={CHART_COLORS.gastos} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800/80 bg-slate-900/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">
            Gastos del mes por categoría ({monthName} {reportYear})
          </CardTitle>
          <CardDescription className="text-slate-400">
            Desglose de gastos asociados a los cierres del mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyExpensesByCategory.every((e) => e.total === 0) ? (
            <p className="text-sm text-slate-500 py-2">No hay gastos registrados este mes.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {monthlyExpensesByCategory.map(({ category, total }) => (
                <li
                  key={category}
                  className="flex flex-col rounded-lg border border-slate-800/80 bg-slate-900/50 p-3"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {expenseCategoryLabel[category as ExpenseCategory]}
                  </span>
                  <span className="mt-0.5 text-lg font-black tabular-nums text-slate-100">
                    {formatCop(total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Calendario del mes</h2>
        <p className="text-xs text-slate-500">
          En cada día se muestra el saldo total (a arrastrar). Pulse un día con registro para ver el detalle.
        </p>
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
                        ? "cursor-pointer border-slate-700/80 bg-slate-800/90 hover:border-slate-500 hover:bg-slate-800"
                        : "cursor-default border-slate-800/50 bg-slate-950/50 opacity-50"
                    )}
                  >
                    <span className="text-xs font-medium text-slate-400">{cell.day}</span>
                    {hasData && c ? (
                      <span className="flex flex-1 items-center justify-center text-center text-base font-semibold tabular-nums text-slate-50 sm:text-lg">
                        {formatCop(c.system_expected_balance)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ClosureForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        suggestedInitialBalance={suggestedInitialBalance}
        editingClosureId={editingClosureId}
        initialValues={editingInitialValues}
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
            <SheetTitle className="text-slate-50">Detalle del cierre</SheetTitle>
            <SheetDescription className="text-slate-400">
              {selectedAnalytics ? formatDateOnlyEsCO(selectedAnalytics.fecha) : "Seleccione un día con registro"}
            </SheetDescription>
          </SheetHeader>
          {selectedAnalytics && selectedClosure ? (
            <div className="mt-8 space-y-6">
              <dl className="space-y-4">
                {(
                  [
                    ["Saldo inicial", formatCop(selectedAnalytics.saldoInicial)],
                    ["Venta efectivo", formatCop(selectedAnalytics.ventaEfectivo)],
                    ["Entradas transferencia", formatCop(selectedAnalytics.entradasTransferencia)],
                    ["Gastos del día", formatCop(selectedAnalytics.gastosDelDia)],
                    ["Saldo total", formatCop(selectedAnalytics.saldoTotal)],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3"
                  >
                    <dt className="text-sm text-slate-400">{label}</dt>
                    <dd className="text-right text-sm font-medium tabular-nums text-slate-100">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-100 hover:bg-slate-800"
                  onClick={() => void openEditFromSheet()}
                  disabled={isLoadingEdit}
                >
                  <Pencil className="mr-2 size-4" aria-hidden />
                  {isLoadingEdit ? "Cargando…" : "Editar cierre"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-red-900/50 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                  onClick={openDeleteFromSheet}
                >
                  <Trash2 className="mr-2 size-4" aria-hidden />
                  Eliminar
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cierre?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el cierre del{" "}
              {closureToDelete ? formatDateOnlyEsCO(closureToDelete.closure_date) : ""}? Se eliminarán
              también los gastos asociados. Esta acción no se puede deshacer.
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
