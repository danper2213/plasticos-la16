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
import { SamitForm } from "@/components/samit/samit-form";
import { formatCop } from "@/lib/format";
import { deleteSamitClosure, type SamitClosure } from "./actions";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Suspense } from "react";
import { formatDateOnlyEsCO } from "@/lib/calendar-date";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [closureToDelete, setClosureToDelete] = React.useState<SamitClosure | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  function handleFormSuccess() {
    router.refresh();
  }

  function openDeleteDialog(row: SamitClosure) {
    setClosureToDelete(row);
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
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">SAMIT</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Registro diario: saldo inicial, venta sistema, pagos y total. El total se arrastra al día siguiente.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Suspense fallback={<div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />}>
            <MonthPaginator basePath="/dashboard/closures/samit" />
          </Suspense>
          <Button onClick={() => setFormOpen(true)} className="w-fit">
            + Registrar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Total</strong> = Saldo inicial + Venta sistema − Pagos. Ese valor se usa como <strong className="text-foreground">Saldo inicial</strong> del día siguiente.
        </p>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right whitespace-nowrap">Saldo inicial</TableHead>
              <TableHead className="text-right whitespace-nowrap">Venta sistema</TableHead>
              <TableHead className="text-right whitespace-nowrap">Pagos</TableHead>
              <TableHead className="text-right whitespace-nowrap">Total</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay registros este mes. Use &quot;+ Registrar&quot; para agregar uno.
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
                    {formatCop(row.sales_total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.payments_total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCop(row.total)}
                  </TableCell>
                  <TableCell className="w-[60px]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Eliminar registro"
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

      <SamitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        suggestedInitialBalance={suggestedInitialBalance}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el registro del {closureToDelete ? formatDateOnlyEsCO(closureToDelete.closure_date) : ""}? Esta acción no se puede deshacer.
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
