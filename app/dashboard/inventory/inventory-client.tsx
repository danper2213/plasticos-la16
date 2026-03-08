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
import { MovementForm } from "@/components/inventory/movement-form";
import { formatCop } from "@/lib/format";
import type { MovementWithProduct } from "./actions";
import type { ActiveProductOption } from "./actions";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

function MovementTypeBadge({ type }: { type: string }) {
  if (type === "in") {
    return <Badge variant="success">{MOVEMENT_TYPE_LABELS[type] ?? type}</Badge>;
  }
  if (type === "out") {
    return <Badge variant="destructive">{MOVEMENT_TYPE_LABELS[type] ?? type}</Badge>;
  }
  return <Badge variant="warning">{MOVEMENT_TYPE_LABELS[type] ?? type}</Badge>;
}

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

interface InventoryClientProps {
  movements: MovementWithProduct[];
  products: ActiveProductOption[];
}

export function InventoryClient({ movements, products }: InventoryClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);

  function handleFormSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kardex / Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Movimientos de inventario (entradas, salidas y ajustes).
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-fit">
          + Registrar Movimiento
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo Unitario</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay movimientos registrados. Haga clic en &quot;+ Registrar Movimiento&quot; para agregar uno.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.movement_date)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{row.product_name}</span>
                    {row.product_presentation ? (
                      <span className="ml-1 text-muted-foreground">({row.product_presentation})</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <MovementTypeBadge type={row.movement_type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.historical_unit_cost)}
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

      <MovementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        products={products}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
