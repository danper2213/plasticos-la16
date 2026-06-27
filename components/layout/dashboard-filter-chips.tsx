"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type DashboardFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
};

export function DashboardFilterChips({
  chips,
  onClearAll,
}: DashboardFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-background/40 p-2 backdrop-blur-sm"
      role="list"
      aria-label="Filtros activos"
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          role="listitem"
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-foreground shadow-sm shadow-primary/5",
          )}
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground"
            onClick={chip.onRemove}
            aria-label={`Quitar filtro ${chip.label}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClearAll}
        >
          Limpiar todo
        </Button>
      ) : null}
    </div>
  );
}
