"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { setPayableDragData } from "@/lib/payables-drag";
import { usePayablesDrag } from "@/components/payables/payables-drag-context";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

export function PayableDragChip({
  row,
  sourceDateKey,
  size = "sm",
}: {
  row: PayableWithSupplier;
  sourceDateKey: string;
  size?: "sm" | "md";
}) {
  const { draggingPayableId, beginPointerDrag, beginHtmlDrag, endHtmlDrag, isRescheduling } =
    usePayablesDrag();
  const isDragging = draggingPayableId === row.id;
  const isPaid = row.status === "paid";
  const label = `${row.supplier_name} · #${row.invoice_number}`;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setPayableDragData(e, { id: row.id, sourceDateKey });
        beginHtmlDrag(row.id);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        endHtmlDrag();
      }}
      onPointerDown={(e) => {
        beginPointerDrag({ id: row.id, sourceDateKey }, row.supplier_name, e);
      }}
      title={`${label}. Mantén pulsado y arrastra a otro día.`}
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-md border font-semibold leading-tight",
        "cursor-grab active:cursor-grabbing touch-none select-none",
        "transition-opacity hover:shadow-sm active:scale-[0.98]",
        size === "md" ? "px-2.5 py-1.5 text-xs" : "px-1.5 py-1 text-[10px] sm:text-[11px]",
        isDragging && "opacity-35",
        isRescheduling && "pointer-events-none opacity-50",
        isPaid
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "border-primary/30 bg-primary/10 text-primary"
      )}
    >
      <GripVertical
        className={cn("shrink-0 opacity-50", size === "md" ? "size-4" : "size-3")}
        aria-hidden
      />
      <span className="truncate">{row.supplier_name}</span>
    </div>
  );
}
