"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchBarTypewriterPlaceholder } from "@/components/ui/search-bar-typewriter-placeholder";
import { cn } from "@/lib/utils";

export type DashboardSearchBarHandle = {
  focus: () => void;
};

type DashboardSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  placeholder?: string;
  /** Ejemplos que rotan en el placeholder cuando el campo está vacío. */
  rotatingPlaceholder?: readonly string[];
  ariaLabel?: string;
  variant?: "default" | "hero" | "sticky";
  align?: "center" | "start";
  /** Mantiene la barra expandida (p. ej. hero de productos). */
  alwaysExpanded?: boolean;
};

export const DashboardSearchBar = forwardRef<
  DashboardSearchBarHandle,
  DashboardSearchBarProps
>(function DashboardSearchBar(
  {
    value,
    onChange,
    onClear,
    onSubmit,
    placeholder = "Buscar…",
    rotatingPlaceholder,
    ariaLabel = "Buscar",
    variant = "default",
    align = "center",
    alwaysExpanded = false,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const focusAfterExpandRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const isHero = variant === "hero";
  const isSticky = variant === "sticky";

  const hasQuery = value.trim().length > 0;
  const expanded = isSticky || alwaysExpanded || focused || hasQuery;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const showAnimatedPlaceholder =
    Boolean(rotatingPlaceholder?.length) && expanded && !hasQuery && !focused;

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        if (isSticky || expandedRef.current) {
          inputRef.current?.focus();
          return;
        }
        focusAfterExpandRef.current = true;
        setFocused(true);
      },
    }),
    [isSticky],
  );

  useLayoutEffect(() => {
    if (!focusAfterExpandRef.current) return;
    focusAfterExpandRef.current = false;
    inputRef.current?.focus();
  });

  function handleContainerClick() {
    if (!expanded) {
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClear();
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  const barHeight = isSticky ? "h-10" : isHero ? "h-14" : "h-12";
  const collapsedSize = isHero ? "w-16" : "w-12";
  const expandedMaxWidth = isSticky
    ? "max-w-3xl"
    : isHero
      ? alwaysExpanded
        ? "max-w-full"
        : "max-w-xl"
      : "max-w-md";
  const iconSize = isSticky ? "size-4" : isHero ? "size-6" : "size-5";
  const iconLeft = isSticky ? "left-3.5" : isHero ? "left-5" : "left-4";
  const inputPadding = isSticky
    ? "pl-10 pr-10 text-sm"
    : isHero
      ? "pl-14 pr-12 text-base"
      : "pl-12 pr-11 text-base";

  return (
    <div className={cn("flex w-full", align === "start" ? "justify-start" : "justify-center")}>
      <div
        className={cn(
          "transition-[width,max-width] duration-300 ease-out motion-reduce:transition-none",
          expanded ? cn("w-full", expandedMaxWidth) : collapsedSize,
        )}
      >
        <div
          role="search"
          className={cn(
            "relative overflow-hidden rounded-xl border shadow-sm transition-all duration-300 ease-out motion-reduce:transition-none",
            barHeight,
            expanded
              ? cn(
                  "w-full border-primary/35 bg-primary/[0.08] shadow-md shadow-primary/10 ring-2 ring-primary/20 dark:bg-primary/[0.14]",
                  isHero && "rounded-2xl ring-primary/25",
                  isSticky && "rounded-lg bg-muted/80 dark:bg-muted/50",
                  showAnimatedPlaceholder && isHero && "ring-primary/30",
                )
              : cn(
                  "cursor-pointer border-border/70 bg-muted/70 hover:border-primary/30 hover:bg-muted/90 hover:shadow-md hover:shadow-primary/5 dark:bg-muted/50 dark:hover:bg-muted/65",
                  collapsedSize,
                  isHero && "rounded-2xl bg-background/80 shadow-md dark:bg-muted/60",
                ),
          )}
          onClick={handleContainerClick}
        >
          {showAnimatedPlaceholder && isHero ? (
            <div
              className="search-bar-shimmer-track pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] motion-reduce:hidden"
              aria-hidden
            >
              <div className="absolute inset-y-0 w-1/3 animate-[search-bar-shimmer_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/12 to-transparent" />
            </div>
          ) : null}
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-primary transition-all duration-300 ease-out motion-reduce:transition-none",
              iconSize,
              expanded ? cn(iconLeft, "translate-x-0") : "left-1/2 -translate-x-1/2",
            )}
            aria-hidden
          />
          <Input
            ref={inputRef}
            type="text"
            role="searchbox"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={showAnimatedPlaceholder ? " " : placeholder}
            tabIndex={expanded ? 0 : -1}
            className={cn(
              barHeight,
              "border-0 shadow-none transition-all duration-300 ease-out focus-visible:ring-0 motion-reduce:transition-none",
              expanded
                ? cn(
                    "relative z-[1] w-full bg-transparent opacity-100",
                    showAnimatedPlaceholder
                      ? "placeholder:text-transparent"
                      : "placeholder:text-muted-foreground/80",
                    inputPadding,
                  )
                : "pointer-events-none w-0 min-w-0 bg-transparent p-0 opacity-0",
            )}
            aria-label={ariaLabel}
            aria-expanded={expanded}
            aria-keyshortcuts="/ Control+/ Control+Shift+K"
            autoComplete="off"
          />
          {showAnimatedPlaceholder ? (
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 z-[5] flex -translate-y-1/2 items-center truncate text-muted-foreground/80",
                isSticky ? "left-10 pr-10 text-sm" : isHero ? "left-14 pr-12 text-base" : "left-12 pr-11 text-base",
              )}
              aria-hidden
            >
              <SearchBarTypewriterPlaceholder
                terms={rotatingPlaceholder ?? []}
                termClassName="text-foreground/80"
              />
            </div>
          ) : null}
          {expanded && hasQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                isSticky ? "size-8" : "size-9",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});
