"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  Clock,
  CircleDot,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCop } from "@/lib/format";
import { getPayableDragData } from "@/lib/payables-drag";
import { PayablesDayPanel, type DaySummary } from "@/components/payables/payables-day-panel";
import { PayableDragChip } from "@/components/payables/payable-drag-chip";
import {
  PayablesDragProvider,
  payableDropDayProps,
  usePayablesDrag,
  usePayablesDropDayState,
} from "@/components/payables/payables-drag-context";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dueDateKey(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const d = dueDate.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export interface PayablesCalendarProps {
  payables: PayableWithSupplier[];
  month: number;
  year: number;
  todayStr: string;
  onDueDateChange: (
    payableId: string,
    fromDateKey: string,
    toDateKey: string
  ) => Promise<void>;
  onOpenDetail: (row: PayableWithSupplier) => void;
  onCardClick: (e: React.MouseEvent, row: PayableWithSupplier) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onEdit: (row: PayableWithSupplier) => void;
  onRegisterPayment: (row: PayableWithSupplier) => void;
  onDelete: (row: PayableWithSupplier) => void;
}

function buildDaySummaries(
  payables: PayableWithSupplier[],
  todayStr: string
): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();

  for (const row of payables) {
    const key = dueDateKey(row.due_date);
    if (!key) continue;

    let day = map.get(key);
    if (!day) {
      day = {
        dateKey: key,
        payables: [],
        pendingCount: 0,
        paidCount: 0,
        pendingTotal: 0,
        paidTotal: 0,
        hasOverdue: false,
        hasDueToday: false,
      };
      map.set(key, day);
    }

    day.payables.push(row);
    const amount = Number(row.invoice_amount) || 0;
    if (row.status === "pending") {
      day.pendingCount += 1;
      day.pendingTotal += amount;
      if (key < todayStr) day.hasOverdue = true;
      if (key === todayStr) day.hasDueToday = true;
    } else {
      day.paidCount += 1;
      day.paidTotal += amount;
    }
  }

  for (const day of map.values()) {
    day.payables.sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return (Number(b.invoice_amount) || 0) - (Number(a.invoice_amount) || 0);
    });
  }

  return map;
}

function CalendarLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
      role="list"
      aria-label="Leyenda del calendario"
    >
      <span className="flex items-center gap-1.5" role="listitem">
        <span className="size-2.5 rounded-full bg-destructive" aria-hidden />
        Vencida
      </span>
      <span className="flex items-center gap-1.5" role="listitem">
        <span className="size-2.5 rounded-full bg-amber-500" aria-hidden />
        Vence hoy
      </span>
      <span className="flex items-center gap-1.5" role="listitem">
        <span className="size-2.5 rounded-full bg-primary/70" aria-hidden />
        Pendiente
      </span>
      <span className="flex items-center gap-1.5" role="listitem">
        <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden />
        Pagada
      </span>
      <span className="flex items-center gap-1.5 w-full sm:w-auto" role="listitem">
        <GripVertical className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
        Mantén pulsado y arrastra a otro día (móvil y escritorio)
      </span>
    </div>
  );
}

function DayCell({
  date,
  monthDate,
  summary,
  isSelected,
  onSelect,
  onHtmlDragOver,
  onHtmlDrop,
}: {
  date: Date;
  monthDate: Date;
  summary: DaySummary | undefined;
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
  onHtmlDragOver: (dateKey: string, e: React.DragEvent) => void;
  onHtmlDrop: (dateKey: string, e: React.DragEvent) => void;
}) {
  const dateKey = format(date, "yyyy-MM-dd");
  const inMonth = isSameMonth(date, monthDate);
  const isCurrentDay = isToday(date);
  const count = summary?.payables.length ?? 0;
  const hasItems = count > 0;
  const { isDropTarget, canDrop } = usePayablesDropDayState(dateKey);

  const cellTone = !hasItems
    ? ""
    : summary?.hasOverdue
      ? "border-destructive/50 bg-destructive/[0.06] dark:bg-destructive/10"
      : summary?.hasDueToday
        ? "border-amber-500/50 bg-amber-500/[0.06] dark:bg-amber-500/10"
        : summary && summary.pendingCount > 0
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-emerald-500/30 bg-emerald-500/[0.04]";

  return (
    <div
      role="gridcell"
      {...payableDropDayProps(dateKey)}
      aria-label={format(date, "d 'de' MMMM", { locale: es })}
      onDragOver={(e) => {
        if (!canDrop) return;
        onHtmlDragOver(dateKey, e);
      }}
      onDrop={(e) => {
        if (!canDrop) return;
        onHtmlDrop(dateKey, e);
      }}
      className={cn(
        "group relative flex flex-col rounded-lg border p-1 text-left transition-all",
        "min-h-[72px] sm:min-h-[88px] md:min-h-[128px] md:p-2",
        inMonth
          ? cn(
              "border-border/70 bg-card",
              cellTone,
              isCurrentDay && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background",
              isSelected && "border-primary shadow-md shadow-primary/10",
              isDropTarget &&
                canDrop &&
                "z-10 scale-[1.02] border-primary ring-2 ring-primary/60 bg-primary/10 shadow-lg shadow-primary/15"
            )
          : "border-transparent bg-muted/20 opacity-50",
        isDropTarget && canDrop && !inMonth && "opacity-80 ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-0.5">
        <button
          type="button"
          disabled={!inMonth || !hasItems}
          onClick={() => inMonth && hasItems && onSelect(dateKey)}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isCurrentDay && inMonth
              ? "bg-primary text-primary-foreground"
              : inMonth
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground cursor-default"
          )}
        >
          {format(date, "d")}
        </button>
        {hasItems && inMonth && (
          <button
            type="button"
            onClick={() => onSelect(dateKey)}
            className="hidden md:block text-[9px] font-semibold text-primary opacity-0 group-hover:opacity-100 hover:underline"
          >
            Ver
          </button>
        )}
      </div>

      {inMonth && summary && summary.payables.length > 0 && (
        <div className="mt-0.5 flex flex-1 flex-col gap-0.5 min-h-0 overflow-hidden">
          {summary.pendingCount > 0 && (
            <p className="hidden md:block text-[9px] font-bold tabular-nums text-amber-700 dark:text-amber-400 truncate">
              {formatCop(summary.pendingTotal)}
            </p>
          )}
          <span
            className={cn(
              "mt-auto inline-flex w-fit rounded px-1 py-0.5 text-[9px] font-bold md:hidden",
              summary.hasOverdue
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/15 text-primary"
            )}
          >
            {count} fact.
          </span>
          <div className="hidden md:flex flex-col gap-0.5 overflow-y-auto max-h-[64px] pr-0.5">
            {summary.payables.map((row) => (
              <PayableDragChip key={row.id} row={row} sourceDateKey={dateKey} />
            ))}
          </div>
        </div>
      )}

      {inMonth && !hasItems && isDropTarget && canDrop && (
        <p className="mt-auto text-[9px] font-medium text-primary text-center py-1">
          Soltar
        </p>
      )}
    </div>
  );
}

function AgendaDaySection({
  summary,
  onDayOpen,
}: {
  summary: DaySummary;
  onDayOpen: () => void;
}) {
  const { isDropTarget, canDrop } = usePayablesDropDayState(summary.dateKey);
  const date = parseISO(summary.dateKey);
  const label = format(date, "EEEE d 'de' MMMM", { locale: es });
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all",
        isDropTarget &&
          canDrop &&
          "ring-2 ring-primary/60 border-primary shadow-lg shadow-primary/10"
      )}
      {...payableDropDayProps(summary.dateKey)}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3",
          summary.hasOverdue
            ? "bg-destructive/5 border-destructive/20"
            : summary.hasDueToday
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-muted/40"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {summary.hasOverdue ? (
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
          ) : summary.hasDueToday ? (
            <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CalendarDays className="size-4 shrink-0 text-primary/80" />
          )}
          <h3 className="text-sm font-bold text-foreground truncate">{labelCap}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {summary.pendingCount > 0 && (
            <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {formatCop(summary.pendingTotal)}
            </span>
          )}
          <button
            type="button"
            onClick={onDayOpen}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary"
          >
            Ver
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground mb-1">
          Arrastra hacia otro día de la agenda o al calendario
        </p>
        {summary.payables.map((row) => (
          <PayableDragChip
            key={row.id}
            row={row}
            sourceDateKey={summary.dateKey}
            size="md"
          />
        ))}
      </div>

      {isDropTarget && canDrop && (
        <p className="border-t border-primary/30 bg-primary/5 py-2 text-center text-xs font-semibold text-primary">
          Soltar aquí
        </p>
      )}
    </section>
  );
}

function PayablesCalendarInner({
  payables,
  month,
  year,
  todayStr,
  onDueDateChange,
  onOpenDetail,
  onEdit,
  onRegisterPayment,
  onDelete,
}: PayablesCalendarProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const { isRescheduling, endHtmlDrag, setHtmlDropTarget } = usePayablesDrag();

  const monthDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);

  React.useEffect(() => {
    setSelectedDateKey(null);
    setDayPanelOpen(false);
  }, [month, year]);

  const daySummaries = useMemo(
    () => buildDaySummaries(payables, todayStr),
    [payables, todayStr]
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const agendaDays = useMemo(() => {
    const keys = Array.from(daySummaries.keys()).sort();
    return keys.map((k) => daySummaries.get(k)!);
  }, [daySummaries]);

  const selectedSummary = selectedDateKey
    ? daySummaries.get(selectedDateKey) ?? null
    : null;

  function handleDaySelect(dateKey: string) {
    setSelectedDateKey(dateKey);
    setDayPanelOpen(true);
  }

  async function handleHtmlDrop(targetDateKey: string, e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const payload = getPayableDragData(e);
    endHtmlDrag();
    if (!payload || payload.sourceDateKey === targetDateKey) return;
    await onDueDateChange(payload.id, payload.sourceDateKey, targetDateKey);
  }

  function handleHtmlDragOver(dateKey: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setHtmlDropTarget(dateKey);
  }

  const monthLabel = format(monthDate, "LLLL yyyy", { locale: es });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="space-y-4">
      <CalendarLegend />

      <div className="rounded-2xl border border-border/80 bg-card/50 p-2 sm:p-4 shadow-sm backdrop-blur-sm overflow-x-auto">
        <div className="mb-2 sm:mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-[280px]">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="size-4 text-primary shrink-0" />
            <span className="truncate">Calendario — {monthLabelCap}</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Arrastra entre días · Toca el número para ver facturas
          </p>
        </div>

        {isRescheduling && (
          <p className="mb-2 text-xs font-medium text-primary animate-pulse">
            Actualizando fecha de vencimiento…
          </p>
        )}

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 min-w-[280px]">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 min-w-[280px]">
          {calendarDays.map((date) => {
            const dateKey = format(date, "yyyy-MM-dd");
            return (
              <DayCell
                key={dateKey}
                date={date}
                monthDate={monthDate}
                summary={daySummaries.get(dateKey)}
                isSelected={selectedDateKey === dateKey && dayPanelOpen}
                onSelect={handleDaySelect}
                onHtmlDragOver={handleHtmlDragOver}
                onHtmlDrop={handleHtmlDrop}
              />
            );
          })}
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground md:hidden">
          En pantallas pequeñas usa la agenda debajo para arrastrar con más espacio.
        </p>
      </div>

      <div className="md:hidden space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground px-0.5">
          <GripVertical className="size-4 text-primary" />
          Agenda — arrastra entre días
        </h2>
        {agendaDays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed">
            No hay facturas con vencimiento en este mes.
          </p>
        ) : (
          agendaDays.map((summary) => (
            <AgendaDaySection
              key={summary.dateKey}
              summary={summary}
              onDayOpen={() => handleDaySelect(summary.dateKey)}
            />
          ))
        )}
      </div>

      <div className="hidden md:block lg:hidden space-y-2">
        <p className="text-xs text-center text-muted-foreground mb-2">
          O elige un día de la lista
        </p>
        {agendaDays.map((summary) => (
          <button
            key={summary.dateKey}
            type="button"
            onClick={() => handleDaySelect(summary.dateKey)}
            className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-3 text-left hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.99]"
          >
            <span className="text-sm font-semibold capitalize">
              {format(parseISO(summary.dateKey), "EEEE d MMM", { locale: es })}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {summary.pendingCount > 0 && (
                <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatCop(summary.pendingTotal)}
                </span>
              )}
              <CircleDot className="size-3.5" />
              {summary.payables.length} facturas
              <ChevronRight className="size-4 text-primary" />
            </span>
          </button>
        ))}
      </div>

      <PayablesDayPanel
        open={dayPanelOpen}
        onOpenChange={setDayPanelOpen}
        summary={selectedSummary}
        todayStr={todayStr}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onRegisterPayment={onRegisterPayment}
        onDelete={onDelete}
      />
    </div>
  );
}

export function PayablesCalendar(props: PayablesCalendarProps) {
  return (
    <PayablesDragProvider onDueDateChange={props.onDueDateChange}>
      <PayablesCalendarInner {...props} />
    </PayablesDragProvider>
  );
}
