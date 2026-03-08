"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TransactionForm } from "@/components/banks/transaction-form";
import { formatCop } from "@/lib/format";
import type { BankAccount, TransactionWithRelations, FinancialCategory } from "./actions";

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: "Ingreso",
  expense: "Egreso",
};

function TransactionTypeBadge({ type }: { type: string }) {
  if (type === "income") {
    return <Badge variant="success">{TRANSACTION_TYPE_LABELS[type] ?? type}</Badge>;
  }
  return <Badge variant="destructive">{TRANSACTION_TYPE_LABELS[type] ?? type}</Badge>;
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

interface BanksClientProps {
  bankAccounts: BankAccount[];
  transactions: TransactionWithRelations[];
  categories: FinancialCategory[];
}

export function BanksClient({
  bankAccounts,
  transactions,
  categories,
}: BanksClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);

  function handleFormSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Flujo de Caja</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas bancarias y movimientos diarios.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-fit">
          + Registrar Movimiento
        </Button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {bankAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{account.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatCop(account.current_balance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions table */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay movimientos. Haga clic en &quot;+ Registrar Movimiento&quot; para agregar uno.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.transaction_date)}</TableCell>
                  <TableCell className="font-medium">{row.bank_account_name}</TableCell>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell>
                    <TransactionTypeBadge type={row.transaction_type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCop(row.amount)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {row.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        bankAccounts={bankAccounts}
        categories={categories}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
