"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReceivableForm } from "@/components/receivables/receivable-form";
import { CollectionModal } from "@/components/receivables/collection-modal";
import { formatCop } from "@/lib/format";
import type { ReceivableWithCustomer, BankAccountOption } from "./actions";
import type { ActiveCustomerOption } from "./actions";

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

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return <Badge variant="success">Pagada</Badge>;
  }
  return <Badge variant="warning">Pendiente</Badge>;
}

interface ReceivablesClientProps {
  receivables: ReceivableWithCustomer[];
  customers: ActiveCustomerOption[];
  bankAccounts: BankAccountOption[];
}

export function ReceivablesClient({
  receivables,
  customers,
  bankAccounts,
}: ReceivablesClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = React.useState(false);
  const [selectedReceivableForCollection, setSelectedReceivableForCollection] =
    React.useState<ReceivableWithCustomer | null>(null);

  function handleFormSuccess() {
    router.refresh();
  }

  function openCollectionModal(receivable: ReceivableWithCustomer) {
    setSelectedReceivableForCollection(receivable);
    setCollectionModalOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cuentas por Cobrar</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas por cobrar a clientes.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-fit">
          + Nueva Cuenta por Cobrar
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead className="text-right">Monto ($ COP)</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay cuentas por cobrar. Haga clic en &quot;+ Nueva Cuenta por Cobrar&quot; para agregar una.
                </TableCell>
              </TableRow>
            ) : (
              receivables.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{row.concept}</TableCell>
                  <TableCell>{row.external_invoice_number ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.total_amount)}
                  </TableCell>
                  <TableCell>{formatDate(row.due_date)}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "pending" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label="Abrir menú">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCollectionModal(row)}>
                            <Banknote className="size-4" />
                            Registrar Recaudo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReceivableForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customers={customers}
        onSuccess={handleFormSuccess}
      />

      <CollectionModal
        open={collectionModalOpen}
        onOpenChange={setCollectionModalOpen}
        receivable={selectedReceivableForCollection}
        bankAccounts={bankAccounts}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
