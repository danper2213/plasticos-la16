"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getPaymentsByPayable } from "@/app/dashboard/payables/actions";
import { formatCop } from "@/lib/format";

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

interface PaymentHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payableId: string | null;
  invoice_number: string;
  supplier_name: string;
}

export function PaymentHistoryModal({
  open,
  onOpenChange,
  payableId,
  invoice_number,
  supplier_name,
}: PaymentHistoryModalProps) {
  const [payments, setPayments] = React.useState<
    Awaited<ReturnType<typeof getPaymentsByPayable>>
  >([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && payableId) {
      setLoading(true);
      getPaymentsByPayable(payableId).then((data) => {
        setPayments(data);
        setLoading(false);
      });
    } else {
      setPayments([]);
    }
  }, [open, payableId]);

  const title = invoice_number
    ? `Historial de Pagos - ${invoice_number}`
    : "Historial de Pagos";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {supplier_name}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay pagos registrados para esta factura.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Origen de Fondos</TableHead>
                  <TableHead className="w-[80px] text-center">Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCop(p.amount_paid)}
                    </TableCell>
                    <TableCell>{p.source_of_funds}</TableCell>
                    <TableCell className="text-center">
                      {p.receipt_url ? (
                        <a
                          href={p.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button variant="ghost" size="icon" className="size-8" aria-label="Ver comprobante">
                            <Eye className="size-4" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
