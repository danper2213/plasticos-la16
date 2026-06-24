"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type ProductsFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
};

export function ProductsFilterChips({
  chips,
  onClearAll,
}: ProductsFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Activos
      </span>
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="gap-1 rounded-lg border border-primary/20 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
        >
          {chip.label}
          <button
            type="button"
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground"
            onClick={chip.onRemove}
            aria-label={`Quitar filtro ${chip.label}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
          onClick={onClearAll}
        >
          Limpiar todo
        </Button>
      ) : null}
    </div>
  );
}
