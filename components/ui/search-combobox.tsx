"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { matchesSearchQuery } from "@/lib/searchEngine";
import { cn } from "@/lib/utils";

export interface SearchComboboxOption {
  value: string;
  label: string;
}

interface SearchComboboxProps {
  options: SearchComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Llamado al abrir (focus). Útil para resetear búsqueda desde el padre. */
  onOpen?: () => void;
}

export function SearchCombobox({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  className,
  inputClassName,
  emptyMessage = "Ningún resultado coincide con la búsqueda.",
  disabled = false,
  onOpen,
}: SearchComboboxProps) {
  const [search, setSearch] = React.useState("");
  const [listOpen, setListOpen] = React.useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = options.find((o) => o.value === value);
  // Al escribir, mostrar siempre el texto de búsqueda para que no se "trague" lo que escribe el usuario
  const displayValue =
    search.length > 0 && (!selectedOption || search !== selectedOption.label)
      ? search
      : selectedOption
        ? selectedOption.label
        : search;

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((o) => matchesSearchQuery(search, o.label));
  }, [options, search]);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setListOpen(false), 200);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative rounded-xl border border-border/70 bg-muted/70 shadow-sm transition-all focus-within:border-primary/35 focus-within:bg-primary/[0.08] focus-within:ring-2 focus-within:ring-primary/20 dark:bg-muted/50">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 size-4 text-primary" aria-hidden />
        <Input
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            if (selectedOption) onChange("");
            setListOpen(true);
          }}
          onFocus={() => {
            setListOpen(true);
            onOpen?.();
          }}
          onBlur={scheduleClose}
          className={cn(
            "h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0",
            inputClassName,
          )}
          aria-autocomplete="list"
          aria-expanded={listOpen && filtered.length > 0}
        />
      </div>
      {listOpen && filtered.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
          role="listbox"
        >
          {filtered.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={value === o.value}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                value === o.value && "bg-accent text-accent-foreground"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.value);
                setSearch(o.label);
                setListOpen(false);
                clearCloseTimer();
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {search.trim() && filtered.length === 0 && listOpen && (
        <p className="absolute left-0 right-0 top-full z-50 mt-1 text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
