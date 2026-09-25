"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useTheme } from "next-themes";
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
  cuadreTone,
  samitDifferenceLabel,
  withDerived,
  type CuadreTone,
  type DailyRegisterDerived,
} from "./calc";
import {
  deleteDailyRegister,
  getDailyRegisterForEdit,
  type DailyRegister,
} from "./actions";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Pencil,
  Scale,
  Trash2,
  Wallet,
} from "lucide-react";
import { formatDateOnlyEsCO, localDateInputValue } from "@/lib/calendar-date";
import { endOfMonth, getISODay, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

type RegisterView = DailyRegister & DailyRegisterDerived;

const TONE_STYLES: Record<
  CuadreTone,
  { text: string; chip: string; cell: string; dot: string }
> = {
  ok: {
    text: "text-emerald-700 dark:text-emerald-300",
    chip: "bg-emerald-500/10 text-emerald-800 ring-emerald-500/25 dark:text-emerald-200",
    cell: "border-emerald-500/35 bg-emerald-500/[0.08] hover:border-emerald-500/55 hover:bg-emerald-500/[0.12]",
    dot: "bg-emerald-500",
  },
  short: {
    text: "text-red-700 dark:text-red-300",
    chip: "bg-red-500/10 text-red-800 ring-red-500/25 dark:text-red-200",
    cell: "border-red-500/30 bg-red-500/[0.06] hover:border-red-500/50 hover:bg-red-500/[0.1]",
    dot: "bg-red-500",
  },
  over: {
    text: "text-amber-800 dark:text-amber-200",
    chip: "bg-amber-500/12 text-amber-900 ring-amber-500/30 dark:text-amber-100",
    cell: "border-amber-500/40 bg-amber-500/[0.1] hover:border-amber-500/60 hover:bg-amber-500/[0.14]",
    dot: "bg-amber-500",
  },
};

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
  samit: "#0ea5e9",
  recaudado: "#10b981",
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

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-black tabular-nums tracking-tight", valueClassName)}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function RegistroDiarioClient({
  registers,
  reportMonth,
  reportYear,
  suggestedPreviousBalance,
}: RegistroDiarioClientProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
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
  const todayKey = localDateInputValue();
  const chartDark = resolvedTheme === "dark";

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
    const rows: { dia: number; esperado: number; recaudado: number }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const key = ymd(reportYear, reportMonth, d);
      const row = registerMap.get(key);
      rows.push({
        dia: d,
        esperado: row?.expectedCollected ?? 0,
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
  const selectedTone = selectedRegister ? cuadreTone(selectedRegister.samitDifference) : "ok";

  const axis = chartDark ? "#94a3b8" : "#64748b";
  const grid = chartDark ? "#334155" : "#e2e8f0";
  const tooltipStyle = {
    backgroundColor: chartDark ? "#18181b" : "#ffffff",
    border: chartDark ? "1px solid #3f3f46" : "1px solid #e2e8f0",
    borderRadius: "12px",
    color: chartDark ? "#fafafa" : "#0f172a",
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        icon={ClipboardList}
        title="Registro diario"
        description="Efectivo y transferencias deben coincidir con la venta SAMIT menos gastos y pagos de facturas. El saldo a arrastrar es el saldo anterior del día siguiente."
        actions={
          <>
            <Suspense fallback={<div className="h-11 w-40 animate-pulse rounded-xl bg-muted" />}>
              <MonthPaginator basePath="/dashboard/registro-diario" />
            </Suspense>
            <Button onClick={openCreateDialog} className="h-11 rounded-xl">
              + Registrar día
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Venta SAMIT"
          value={formatCop(kpis.totalSamit)}
          hint={`Suma de ${monthName}`}
          icon={Scale}
          valueClassName="text-sky-700 dark:text-sky-300"
        />
        <MetricCard
          label="Recaudado"
          value={formatCop(kpis.totalRecaudado)}
          hint="Efectivo + transferencias"
          icon={ArrowDownLeft}
          valueClassName="text-emerald-700 dark:text-emerald-300"
        />
        <MetricCard
          label="Gastos + pagos"
          value={formatCop(kpis.totalSalidas)}
          hint="Salidas del mes"
          icon={ArrowUpRight}
          valueClassName="text-orange-700 dark:text-orange-300"
        />
        <MetricCard
          label="Saldo a arrastrar"
          value={registers.length === 0 ? "—" : formatCop(kpis.saldoProyectado)}
          hint={
            kpis.last
              ? `Último registro: ${formatDateOnlyEsCO(kpis.last.register_date)}`
              : `Sin registros en ${monthName}`
          }
          icon={Wallet}
          valueClassName={
            kpis.last && kpis.saldoProyectado < 0 ? "text-red-600 dark:text-red-400" : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="border-border/80 shadow-sm xl:col-span-3">
          <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Calendario de {monthName}</CardTitle>
              <CardDescription>
                Cada día muestra el saldo a arrastrar. El color indica si efectivo y transferencias cuadran con las ventas menos gastos y pagos.
              </CardDescription>
            </div>
            <ul className="flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
              {(
                [
                  ["ok", "Cuadra"],
                  ["short", "Falta"],
                  ["over", "Sobra"],
                ] as const
              ).map(([tone, label]) => (
                <li key={tone} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", TONE_STYLES[tone].dot)} aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </CardHeader>
          <CardContent>
            <div className="-mx-1 overflow-x-auto pb-1">
              <div className="min-w-[640px] px-1">
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS_ES.map((w) => (
                    <div
                      key={w}
                      className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {w}
                    </div>
                  ))}
                  {calendarCells.map((cell, idx) => {
                    if (cell.type === "blank") {
                      return <div key={`b-${idx}`} className="min-h-[92px]" />;
                    }
                    const row = registerMap.get(cell.key);
                    const hasData = Boolean(row);
                    const tone = row ? cuadreTone(row.samitDifference) : "ok";
                    const isToday = cell.key === todayKey;
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!hasData}
                        onClick={() => row && openDayDetail(row)}
                        aria-label={
                          hasData && row
                            ? `${cell.day} de ${monthName}, saldo ${formatCop(row.endingBalance)}, ${samitDifferenceLabel(row.samitDifference)}`
                            : `${cell.day} de ${monthName}, sin registro`
                        }
                        className={cn(
                          "flex min-h-[92px] flex-col rounded-xl border p-2 text-left transition-colors",
                          hasData
                            ? cn("cursor-pointer", TONE_STYLES[tone].cell)
                            : "cursor-default border-dashed border-border/70 bg-muted/20 text-muted-foreground",
                          isToday && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                        )}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isToday ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {cell.day}
                          </span>
                          {hasData ? (
                            <span
                              className={cn("size-1.5 rounded-full", TONE_STYLES[tone].dot)}
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        {hasData && row ? (
                          <span className="mt-auto pt-2">
                            <span className="block text-sm font-bold leading-tight tabular-nums text-foreground sm:text-base">
                              {formatCop(row.endingBalance)}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block text-[10px] font-semibold uppercase tracking-wide",
                                TONE_STYLES[tone].text
                              )}
                            >
                              {samitDifferenceLabel(row.samitDifference)}
                            </span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2">
          {kpis.last ? (
            <Card className="h-full border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Consejos para mañana</CardTitle>
                <CardDescription>
                  Según el registro del {formatDateOnlyEsCO(kpis.last.register_date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyAdviceList items={lastAdvice} />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-dashed border-border/80 bg-muted/20 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Sin cierres este mes</CardTitle>
                <CardDescription>
                  Registra el primer día para ver el saldo a arrastrar y los consejos.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Lo que debía entrar vs lo recaudado</CardTitle>
          <CardDescription>
            Ventas menos gastos y pagos, frente a efectivo más transferencias. {monthName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-0 pr-2 pt-0 sm:pl-2">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barGap={2}
                barCategoryGap="12%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.9} />
                <XAxis
                  dataKey="dia"
                  tick={{ fill: axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: grid }}
                  interval={lastDay > 20 ? 2 : 0}
                />
                <YAxis
                  tick={{ fill: axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: grid }}
                  tickFormatter={compactAxisCop}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: chartDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(dia) => `Día ${dia}`}
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    const label =
                      name === "esperado" || name === "Debería entrar"
                        ? "Debería entrar"
                        : "Efectivo + transferencias";
                    return [formatCop(n), label];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                <Bar
                  dataKey="esperado"
                  name="Debería entrar"
                  fill={CHART_COLORS.samit}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="recaudado"
                  name="Efectivo + transferencias"
                  fill={CHART_COLORS.recaudado}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalle del registro</SheetTitle>
            <SheetDescription>
              {selectedRegister
                ? formatDateOnlyEsCO(selectedRegister.register_date)
                : "Seleccione un día con registro"}
            </SheetDescription>
          </SheetHeader>
          {selectedRegister ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Saldo a arrastrar
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-black tabular-nums tracking-tight",
                    selectedRegister.endingBalance < 0 && "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatCop(selectedRegister.endingBalance)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                      TONE_STYLES[selectedTone].chip
                    )}
                  >
                    {samitDifferenceLabel(selectedRegister.samitDifference)}{" "}
                    {formatCop(Math.abs(selectedRegister.samitDifference))}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                    Recaudado {formatCop(selectedRegister.collected)}
                  </span>
                </div>
              </div>

              <dl className="space-y-0">
                {(
                  [
                    ["Saldo anterior", formatCop(selectedRegister.previous_balance)],
                    ["Venta SAMIT", formatCop(selectedRegister.samit_sales_total)],
                    ["Efectivo", formatCop(selectedRegister.cash_total)],
                    ["Transferencias", formatCop(selectedRegister.transfers_total)],
                    ["Gastos", formatCop(selectedRegister.expenses_total)],
                    ["Pagos de facturas", formatCop(selectedRegister.payments_total)],
                    ["Debería entrar", formatCop(selectedRegister.expectedCollected)],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-border/70 py-2.5"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-right text-sm font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="mb-2 text-sm font-semibold">Consejos para mañana</p>
                <DailyAdviceList items={selectedAdvice} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => void openEditFromSheet()}
                  disabled={isLoadingEdit}
                >
                  <Pencil className="mr-2 size-4" aria-hidden />
                  {isLoadingEdit ? "Cargando…" : "Editar registro"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-red-900/40 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
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
