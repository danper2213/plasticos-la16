"use client";

import { FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDateLongEsCO,
  formatDateTimeNumericEsCO,
  resolveInventoryBatchDisplayDate,
} from "@/lib/calendar-date";
import type { InventoryBatchWithLines } from "@/app/dashboard/inventory/actions";
import { InventoryMovementChip, InventoryPanel } from "@/components/inventory/inventory-ui";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

function summarizeMovements(batch: InventoryBatchWithLines): Array<{
  type: string;
  label: string;
}> {
  const counts = new Map<string, number>();
  for (const line of batch.lines) {
    const label = MOVEMENT_TYPE_LABELS[line.movement_type] ?? line.movement_type;
    counts.set(line.movement_type, (counts.get(line.movement_type) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([type, count]) => {
    const label = MOVEMENT_TYPE_LABELS[type] ?? type;
    return {
      type,
      label: count === 1 ? `1 ${label.toLowerCase()}` : `${count} ${label.toLowerCase()}s`,
    };
  });
}

interface InventoryBatchCardProps {
  batch: InventoryBatchWithLines;
  onOpen: (batch: InventoryBatchWithLines) => void;
}

export function InventoryBatchCard({ batch, onOpen }: InventoryBatchCardProps) {
  const refShort = batch.id.replace(/-/g, "").slice(0, 10).toUpperCase();
  const movementSummary = summarizeMovements(batch);

  return (
    <InventoryPanel
      variant="default"
      className="group transition-all hover:border-primary/25 hover:shadow-md hover:shadow-primary/5"
    >
      <article className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/10 text-primary ring-1 ring-primary/15">
            <FileText className="size-6" />
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Comprobante de inventario
              </p>
              <Badge
                variant="secondary"
                className="border border-border/50 bg-background/60 font-normal backdrop-blur-sm"
              >
                {batch.lines.length} producto{batch.lines.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="text-base font-bold leading-tight text-foreground sm:text-lg">
              {formatDateLongEsCO(
                resolveInventoryBatchDisplayDate(batch.movement_date, batch.created_at),
              )}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">Ref. {refShort}</span>
              <span>Registrado: {formatDateTimeNumericEsCO(batch.created_at)}</span>
              {batch.created_by_email ? (
                <span className="truncate max-w-[220px]">{batch.created_by_email}</span>
              ) : null}
            </div>
            {movementSummary.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {movementSummary.map(({ type, label }) => (
                  <InventoryMovementChip key={type} movementType={type}>
                    {label}
                  </InventoryMovementChip>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0 rounded-xl border-border/60 bg-background/50 px-4 backdrop-blur-sm group-hover:border-primary/40 group-hover:bg-primary/5"
            onClick={() => onOpen(batch)}
          >
            Ver comprobante
            <ChevronRight className="size-4" />
          </Button>
      </article>
    </InventoryPanel>
  );
}
