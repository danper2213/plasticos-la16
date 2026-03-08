"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClosureForm } from "@/components/closures/closure-form";
import { formatCop } from "@/lib/format";
import { expenseCategoryLabel, type ExpenseCategory } from "@/app/dashboard/closures/schema";
import type { Closure, MonthlyExpenseByCategory } from "./actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function DiscrepancyCell({ difference }: { difference: number }) {
  const formatted = formatCop(Math.abs(difference));
  if (difference === 0) {
    return (
      <Badge variant="success" className="font-semibold">
        Cuadrado ({formatCop(0)})
      </Badge>
    );
  }
  if (difference < 0) {
    return (
      <Badge variant="destructive" className="font-semibold">
        - {formatted} (Faltante)
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="font-semibold">
      + {formatted} (Sobrante)
    </Badge>
  );
}

interface ClosuresClientProps {
  closures: Closure[];
  monthlyPaymentsTotal: number;
  monthlyExpensesByCategory: MonthlyExpenseByCategory[];
  reportMonth: number;
  reportYear: number;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function ClosuresClient({
  closures,
  monthlyPaymentsTotal,
  monthlyExpensesByCategory,
  reportMonth,
  reportYear,
}: ClosuresClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);

  function handleFormSuccess() {
    router.refresh();
  }

  const monthName = MONTH_NAMES[reportMonth - 1];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cierres de Caja</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Ventas y pagos del sistema (Hoja A), gastos por categoría, entradas y efectivo (Hoja B).
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-fit">
          + Registrar Cierre
        </Button>
      </div>

      {/* KPI: Total pagado en el mes */}
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-4 shadow-sm max-w-xs">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
          Total pagado en el mes ({monthName} {reportYear})
        </p>
        <p className="text-xl font-black tabular-nums text-foreground">
          {formatCop(monthlyPaymentsTotal)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Suma de pagos del día (facturas, transporte – DIAN).
        </p>
      </div>

      {/* Reporte gastos por categoría del mes */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold text-foreground mb-3">
          Gastos del mes por categoría ({monthName} {reportYear})
        </h2>
        {monthlyExpensesByCategory.every((e) => e.total === 0) ? (
          <p className="text-sm text-muted-foreground py-2">
            No hay gastos registrados este mes.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {monthlyExpensesByCategory.map(({ category, total }) => (
              <li
                key={category}
                className="rounded-lg border border-border bg-muted/50 p-3 flex flex-col"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {expenseCategoryLabel[category as ExpenseCategory]}
                </span>
                <span className="text-lg font-black tabular-nums text-foreground mt-0.5">
                  {formatCop(total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabla de cierres */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Pagos</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Gastos</TableHead>
              <TableHead className="text-right">Esperado</TableHead>
              <TableHead className="text-right">Efectivo en caja</TableHead>
              <TableHead>Diferencia</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No hay cierres registrados. Haga clic en &quot;+ Registrar Cierre&quot; para agregar uno.
                </TableCell>
              </TableRow>
            ) : (
              closures.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.closure_date)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.sales_total ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.payments_total ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.initial_balance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.system_total_income)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.system_total_expense)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.system_expected_balance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.actual_physical_balance)}
                  </TableCell>
                  <TableCell>
                    <DiscrepancyCell difference={row.difference} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {row.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClosureForm open={formOpen} onOpenChange={setFormOpen} onSuccess={handleFormSuccess} />
    </>
  );
}
