"use client";

import { CalendarClock, CircleDollarSign, Hash, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchCombobox } from "@/components/ui/search-combobox";
import type { ActiveSupplierOption } from "@/app/dashboard/products/actions";
import type { InvoicePayableDraft } from "@/app/dashboard/products/invoice-cost-actions";
import { formatDateLongEsCO } from "@/lib/calendar-date";

function formatAmountDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const [intPart, decPart] = String(value).split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${withDots},${decPart.slice(0, 2)}` : withDots;
}

function parseAmountInput(input: string): number | undefined {
  const trimmed = input.trim().replace(/\s/g, "");
  if (trimmed === "") return undefined;
  const withoutThousands = trimmed.replace(/\./g, "");
  const withDecimalDot = withoutThousands.replace(",", ".");
  const num = parseFloat(withDecimalDot);
  return Number.isNaN(num) ? undefined : num;
}

const amountSourceLabel: Record<InvoicePayableDraft["amountSource"], string> = {
  header_iva: "Total con IVA leído de la factura",
  header_neto: "Neto de cabecera × 1,19",
  lines_iva: "Suma de líneas × 1,19",
};

interface InvoicePayableConfirmViewProps {
  draft: InvoicePayableDraft;
  suppliers: ActiveSupplierOption[];
  onChange: (next: InvoicePayableDraft) => void;
}

export function InvoicePayableConfirmView({
  draft,
  suppliers,
  onChange,
}: InvoicePayableConfirmViewProps) {
  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  function patch(partial: Partial<InvoicePayableDraft>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
        {draft.dueDateSource === "after_last" && draft.lastDueDateLabel ? (
          <p className="text-muted-foreground">
            Última factura en el calendario:{" "}
            <span className="font-medium text-foreground capitalize">
              {draft.lastDueDateLabel}
            </span>
            . Siguiente campo sugerido:{" "}
            <span className="font-medium text-foreground capitalize">
              {draft.suggestedDueDateLabel}
            </span>
            .
          </p>
        ) : (
          <p className="text-muted-foreground">
            No hay facturas previas con fecha en el calendario. Se sugiere hoy:{" "}
            <span className="font-medium text-foreground capitalize">
              {draft.suggestedDueDateLabel}
            </span>
            .
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <Truck className="size-3.5 text-muted-foreground" />
            Proveedor
          </Label>
          <SearchCombobox
            options={supplierOptions}
            value={draft.supplierId}
            onChange={(id) => {
              const found = suppliers.find((s) => s.id === id);
              patch({
                supplierId: id,
                supplierLabel: found?.name ?? null,
              });
            }}
            placeholder="Buscar proveedor…"
            emptyMessage="Ningún proveedor coincide con la búsqueda."
          />
          {draft.supplierLabel ? null : draft.supplierId ? null : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Seleccioná el proveedor para registrar en CxP.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <Hash className="size-3.5 text-muted-foreground" />
            Número de factura
          </Label>
          <Input
            value={draft.invoiceNumber}
            onChange={(e) => patch({ invoiceNumber: e.target.value })}
            placeholder="Ej. FE-12345"
            className="rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <CircleDollarSign className="size-3.5 text-muted-foreground" />
            Valor (con IVA)
          </Label>
          <Input
            value={formatAmountDisplay(draft.invoiceAmount)}
            onChange={(e) => {
              const n = parseAmountInput(e.target.value);
              if (n != null) patch({ invoiceAmount: n });
            }}
            inputMode="decimal"
            className="rounded-lg h-10"
          />
          <p className="text-[11px] text-muted-foreground">
            {amountSourceLabel[draft.amountSource]}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Fecha de recepción</Label>
          <Input
            type="date"
            value={draft.receptionDate}
            onChange={(e) => patch({ receptionDate: e.target.value })}
            className="rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <CalendarClock className="size-3.5 text-muted-foreground" />
            Día en el calendario (listado)
          </Label>
          <Input
            type="date"
            value={draft.dueDate}
            onChange={(e) => {
              const dueDate = e.target.value;
              patch({
                dueDate,
                suggestedDueDateLabel: formatDateLongEsCO(dueDate),
              });
            }}
            className="rounded-lg h-10"
          />
          <p className="text-[11px] text-muted-foreground capitalize">
            Se registrará en: {formatDateLongEsCO(draft.dueDate)}
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-sm">Nota (opcional)</Label>
          <Textarea
            value={draft.paymentNote}
            onChange={(e) => patch({ paymentNote: e.target.value })}
            placeholder="Ej. Continua"
            rows={2}
            className="rounded-lg resize-none"
          />
        </div>
      </div>
    </div>
  );
}
