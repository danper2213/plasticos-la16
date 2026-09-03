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
import { DailyRegisterForm } from "@/components/registro-diario/daily-register-form";
import { DailyAdviceList } from "@/components/registro-diario/daily-advice-list";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { formatCop } from "@/lib/format";
import { dailyRegisterSchema, type DailyRegisterFormValues } from "./schema";
import {
  buildDailyAdvice,
  computeDailyRegister,
  samitDifferenceLabel,
  withDerived,
  type DailyRegisterDerived,
} from "./calc";
import {
  deleteDailyRegister,
  getDailyRegisterForEdit,
  type DailyRegister,
} from "./actions";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { toast } from "sonner";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";
import { endOfMonth, getISODay, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

type RegisterView = DailyRegister & DailyRegisterDerived;

function registerDateKey(register_date: string): string {
  return register_date.slice(0, 10);
}

function buildRegisterMap(registers: DailyRegister[]): Map<string, RegisterView> {
  const sorted = [...registers].sort((a, b) =>
    registerDateKey(a.register_date).localeCompare(registerDateKey(b.register_date))
  );
  const m = new Map<string, RegisterView>();
  for (const row of sorted) {
    m.set(registerDateKey(row.register_date), withDerived(row));
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
  samit: "#38bdf8",
  recaudado: "#34d399",
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

interface RegistroDiarioClientProps {
  registers: DailyRegister[];
  reportMonth: number;
  reportYear: number;
  suggestedPreviousBalance: number;
}

export function RegistroDiarioClient({
  registers,
  reportMonth,
  reportYear,
  suggestedPreviousBalance,
}: RegistroDiarioClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingRegisterId, setEditingRegisterId] = React.useState<string | null>(null);
  const [editingInitialValues, setEditingInitialValues] =
    React.useState<DailyRegisterFormValues | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedRegister, setSelectedRegister] = React.useState<RegisterView | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [registerToDelete, setRegisterToDelete] = React.useState<RegisterView | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const registerMap = React.useMemo(() => buildRegisterMap(registers), [registers]);

  const monthStart = React.useMemo(
    () => startOfMonth(new Date(reportYear, reportMonth - 1, 1)),
    [reportMonth, reportYear]
  );
  const lastDay = React.useMemo(() => endOfMonth(monthStart).getDate(), [monthStart]);
  const monthName = MONTH_NAMES[reportMonth - 1];

  const views = React.useMemo(
    () => registers.map((row) => withDerived(row)),
    [registers]
  );

  const kpis = React.useMemo(() => {
    let totalSamit = 0;
    let totalRecaudado = 0;
    let totalSalidas = 0;
    for (const row of views) {
      totalSamit += row.samit_sales_total;
      totalRecaudado += row.collected;
      totalSalidas += row.outflows;
    }
    const sortedAsc = [...views].sort((a, b) =>
      registerDateKey(a.register_date).localeCompare(registerDateKey(b.register_date))
    );
    const last = sortedAsc[sortedAsc.length - 1];
    return {
      totalSamit,
      totalRecaudado,
      totalSalidas,
      saldoProyectado: last?.endingBalance ?? 0,
      last,
    };
  }, [views]);

  const lastAdvice = React.useMemo(() => {
    if (!kpis.last) return [];
    return buildDailyAdvice(kpis.last, computeDailyRegister(kpis.last));
  }, [kpis.last]);

  const chartData = React.useMemo(() => {
    const rows: { dia: number; samit: number; recaudado: number }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const key = ymd(reportYear, reportMonth, d);
      const row = registerMap.get(key);
      rows.push({
        dia: d,
        samit: row?.samit_sales_total ?? 0,
        recaudado: row?.collected ?? 0,
      });
    }
    return rows;
  }, [registerMap, lastDay, reportMonth, reportYear]);

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
    setEditingRegisterId(null);
    setEditingInitialValues(null);
  }

  function openCreateDialog() {
    setEditingRegisterId(null);
    setEditingInitialValues(null);
    setFormOpen(true);
  }

  async function loadRegisterIntoForm(row: RegisterView) {
    setIsLoadingEdit(true);
    const result = await getDailyRegisterForEdit(row.id);
    setIsLoadingEdit(false);
    if (!result.success) {
      toast.error(result.error ?? "No se pudo cargar el registro para edición");
      return false;
    }

    const parsed = dailyRegisterSchema.safeParse({
      register_date: result.data.register_date,
      previous_balance: result.data.previous_balance,
      samit_sales_total: result.data.samit_sales_total,
      cash_total: result.data.cash_total,
      transfers_total: result.data.transfers_total,
      expenses_total: result.data.expenses_total,
      payments_total: result.data.payments_total,
    });
    if (!parsed.success) {
      toast.error("El registro tiene datos inválidos para edición.");
      return false;
    }

    setEditingRegisterId(row.id);
    setEditingInitialValues(parsed.data);
    setFormOpen(true);
    return true;
  }

  async function openEditFromSheet() {
    if (!selectedRegister) return;
    const ok = await loadRegisterIntoForm(selectedRegister);
    if (ok) {
      setDetailOpen(false);
      setSelectedRegister(null);
    }
  }

  function openDayDetail(row: RegisterView) {
    setSelectedRegister(row);
    setDetailOpen(true);
  }

  function openDeleteFromSheet() {
    if (!selectedRegister) return;
    setRegisterToDelete(selectedRegister);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!registerToDelete) return;
    setIsDeleting(true);
    const result = await deleteDailyRegister(registerToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setRegisterToDelete(null);
    if (result.success) {
      toast.success("Registro eliminado correctamente");
      setDetailOpen(false);
      setSelectedRegister(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el registro");
    }
  }

  const selectedAdvice = selectedRegister
    ? buildDailyAdvice(selectedRegister, selectedRegister)
    : [];

  return (
    <div
      className={cn(
        "space-y-6 rounded-2xl border border-slate-800/90 bg-slate-950 p-4 shadow-2xl sm:p-6",
        "text-slate-100"
      )}
    >
      <DashboardPageHeader
        icon={ClipboardList}
        title="Registro diario"
        description="Un cierre por día: venta SAMIT, efectivo, transferencias, gastos y pagos. El saldo a arrastrar es el saldo anterior del día siguiente."
        actions={
          <>
            <Suspense fallback={<div className="h-11 w-40 animate-pulse rounded-xl bg-muted" />}>
              <MonthPaginator basePath="/dashboard/registro-diario" />
            </Suspense>
            <Button
              onClick={openCreateDialog}
              className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              + Registrar día
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Venta SAMIT del mes</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-sky-400">
              {formatCop(kpis.totalSamit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Suma del mes seleccionado</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Recaudado</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-emerald-400">
              {formatCop(kpis.totalRecaudado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Efectivo + transferencias</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Gastos + pagos</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-orange-400">
              {formatCop(kpis.totalSalidas)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Salidas del mes</CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Saldo a arrastrar</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-slate-100">
              {registers.length === 0 ? "—" : formatCop(kpis.saldoProyectado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Último día con registro en {monthName}
          </CardContent>
        </Card>
      </div>

      {kpis.last ? (
        <Card className="border-slate-800/80 bg-slate-900/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">Consejos para mañana</CardTitle>
            <CardDescription className="text-slate-400">
              Según el registro del {formatDateOnlyEsCO(kpis.last.register_date)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyAdviceList items={lastAdvice} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-800/80 bg-slate-900/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Venta SAMIT vs recaudado por día</CardTitle>
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
                      name === "samit" || name === "Venta SAMIT" ? "Venta SAMIT" : "Recaudado";
                    return [formatCop(n), label];
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#94a3b8", fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar
                  dataKey="samit"
                  name="Venta SAMIT"
                  fill={CHART_COLORS.samit}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="recaudado"
                  name="Recaudado"
                  fill={CHART_COLORS.recaudado}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Calendario del mes</h2>
        <p className="text-xs text-slate-500">
          En cada día se muestra el saldo a arrastrar. Pulse un día con registro para ver el detalle.
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
                const row = registerMap.get(cell.key);
                const hasData = Boolean(row);
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!hasData}
                    onClick={() => row && openDayDetail(row)}
                    className={cn(
                      "flex min-h-[88px] flex-col rounded-lg border p-2 text-left transition-colors",
                      hasData
                        ? "cursor-pointer border-slate-700/80 bg-slate-800/90 hover:border-slate-500 hover:bg-slate-800"
                        : "cursor-default border-slate-800/50 bg-slate-950/50 opacity-50"
                    )}
                  >
                    <span className="text-xs font-medium text-slate-400">{cell.day}</span>
                    {hasData && row ? (
                      <span className="flex flex-1 items-center justify-center text-center text-base font-semibold tabular-nums text-slate-50 sm:text-lg">
                        {formatCop(row.endingBalance)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DailyRegisterForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        suggestedPreviousBalance={suggestedPreviousBalance}
        editingRegisterId={editingRegisterId}
        initialValues={editingInitialValues}
      />

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedRegister(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="text-slate-50">Detalle del registro</SheetTitle>
            <SheetDescription className="text-slate-400">
              {selectedRegister
                ? formatDateOnlyEsCO(selectedRegister.register_date)
                : "Seleccione un día con registro"}
            </SheetDescription>
          </SheetHeader>
          {selectedRegister ? (
            <div className="mt-8 space-y-6">
              <dl className="space-y-4">
                {(
                  [
                    ["Saldo anterior", formatCop(selectedRegister.previous_balance)],
                    ["Venta SAMIT", formatCop(selectedRegister.samit_sales_total)],
                    ["Efectivo", formatCop(selectedRegister.cash_total)],
                    ["Transferencias", formatCop(selectedRegister.transfers_total)],
                    ["Gastos", formatCop(selectedRegister.expenses_total)],
                    ["Pagos", formatCop(selectedRegister.payments_total)],
                    ["Recaudado", formatCop(selectedRegister.collected)],
                    [
                      `Diferencia vs SAMIT (${samitDifferenceLabel(selectedRegister.samitDifference)})`,
                      formatCop(Math.abs(selectedRegister.samitDifference)),
                    ],
                    ["Saldo a arrastrar", formatCop(selectedRegister.endingBalance)],
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
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-100">Consejos para mañana</p>
                <DailyAdviceList items={selectedAdvice} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-100 hover:bg-slate-800"
                  onClick={() => void openEditFromSheet()}
                  disabled={isLoadingEdit}
                >
                  <Pencil className="mr-2 size-4" aria-hidden />
                  {isLoadingEdit ? "Cargando…" : "Editar registro"}
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
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el registro del{" "}
              {registerToDelete ? formatDateOnlyEsCO(registerToDelete.register_date) : ""}? Esta
              acción no se puede deshacer.
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
