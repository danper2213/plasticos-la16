"use client";

import * as React from "react";
import { format, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCop } from "@/lib/format";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

interface MonthlyProgressProps {
  payables: PayableWithSupplier[];
  month: number;
  year: number;
}

export function MonthlyProgress({ payables, month, year }: MonthlyProgressProps) {
  const date = new Date(year, month - 1, 1);
  const totalDaysInMonth = getDaysInMonth(date);

  const paidInvoices = payables.filter((p) => p.status === "paid");
  const paidCount = paidInvoices.length;
  const missingToPayCount = Math.max(0, totalDaysInMonth - paidCount);

  const totalPaidAmount = paidInvoices.reduce(
    (sum, p) => sum + (Number(p.invoice_amount) || 0),
    0
  );

  const rawMonthName = format(date, "LLLL", { locale: es });
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">
        Facturas a pagar de {monthName}
      </h2>
      <Progress value={paidCount} max={totalDaysInMonth} className="h-3" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-muted/50 bg-muted/30">
          <CardContent className="flex items-center px-4 py-2 text-sm">
            <span className="font-medium text-muted-foreground">
              Meta del mes:
            </span>
            <span className="ml-2 font-semibold tabular-nums">
              {totalDaysInMonth} facturas
            </span>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CardContent className="flex items-center px-4 py-2 text-sm">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Pagadas:
            </span>
            <span className="ml-2 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {paidCount}
            </span>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-center px-4 py-2 text-sm">
            <span className="font-medium text-amber-700 dark:text-amber-400">
              Faltan por Pagar:
            </span>
            <span className="ml-2 font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {missingToPayCount}
            </span>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/40 bg-emerald-500/15 dark:border-emerald-500/40 dark:bg-emerald-500/15">
          <CardContent className="flex flex-col justify-center px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Pagado
            </span>
            <span className="mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCop(totalPaidAmount)}
            </span>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
