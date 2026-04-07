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
import { Button } from "@/components/ui/button";
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
import { ClosureForm } from "@/components/closures/closure-form";
import { formatCop } from "@/lib/format";
import { expenseCategoryLabel, type ExpenseCategory } from "@/app/dashboard/closures/schema";
import { deleteClosure, type Closure, type MonthlyExpenseByCategory } from "./actions";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Suspense } from "react";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";

interface ClosuresClientProps {
  closures: Closure[];
  monthlyExpensesByCategory: MonthlyExpenseByCategory[];
  reportMonth: number;
  reportYear: number;
  suggestedInitialBalance: number;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function ClosuresClient({
  closures,
  monthlyExpensesByCategory,
  reportMonth,
  reportYear,
  suggestedInitialBalance,
}: ClosuresClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [closureToDelete, setClosureToDelete] = React.useState<Closure | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  function handleFormSuccess() {
    router.refresh();
  }

  function openDeleteDialog(row: Closure) {
    setClosureToDelete(row);
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
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el cierre");
    }
  }

  const monthName = MONTH_NAMES[reportMonth - 1];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cierres de Caja</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Registro diario: venta en efectivo, entradas por transferencia y gastos por categoría. El saldo se arrastra al día siguiente.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Suspense fallback={<div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />}>
            <MonthPaginator basePath="/dashboard/closures" />
          </Suspense>
          <Button onClick={() => setFormOpen(true)} className="w-fit">
            + Registrar Cierre
          </Button>
        </div>
      </div>

      {/* Fórmula y arrastre */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Saldo a arrastrar</strong> = Saldo inicial + Venta en efectivo + Entradas por transferencia − Gastos del día. Ese valor se usa como <strong className="text-foreground">Saldo inicial</strong> del día siguiente.
        </p>
      </div>

      {/* Gastos del mes por categoría */}
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

      {/* Tabla: registro diario por mes */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right whitespace-nowrap">Saldo inicial</TableHead>
              <TableHead className="text-right whitespace-nowrap">Venta efectivo</TableHead>
              <TableHead className="text-right whitespace-nowrap">Entradas transferencia</TableHead>
              <TableHead className="text-right whitespace-nowrap">Gastos del día</TableHead>
              <TableHead className="text-right whitespace-nowrap">Saldo total</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay cierres este mes. Use &quot;+ Registrar Cierre&quot; para agregar el registro del día.
                </TableCell>
              </TableRow>
            ) : (
              closures.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateOnlyEsCO(row.closure_date)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.initial_balance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.sales_total ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.system_total_income)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.system_total_expense)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCop(row.system_expected_balance)}
                  </TableCell>
                  <TableCell className="w-[60px]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Eliminar cierre"
                      onClick={() => openDeleteDialog(row)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClosureForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        suggestedInitialBalance={suggestedInitialBalance}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cierre?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el cierre del {closureToDelete ? formatDateOnlyEsCO(closureToDelete.closure_date) : ""}?
              Se eliminarán también los gastos asociados. Esta acción no se puede deshacer.
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
    </>
  );
}
