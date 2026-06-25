"use client";

import { forwardRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  DashboardSearchBar,
  type DashboardSearchBarHandle,
} from "@/components/layout/dashboard-search-bar";
import { cn } from "@/lib/utils";

export function DashboardSearchShortcutsHint() {
  return (
    <span className="mt-2 block text-xs text-muted-foreground/80">
      Atajos:{" "}
      <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
        /
      </kbd>
      {" · "}
      <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
        Ctrl+/
      </kbd>
      {" · "}
      <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
        Ctrl+Shift+K
      </kbd>
    </span>
  );
}

type DashboardSearchHeroProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  ariaLabel: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  placeholder?: string;
  searchAriaLabel?: string;
  status?: ReactNode;
  showShortcuts?: boolean;
};

export const DashboardSearchHero = forwardRef<
  DashboardSearchBarHandle,
  DashboardSearchHeroProps
>(function DashboardSearchHero(
  {
    icon: Icon,
    title,
    description,
    ariaLabel,
    searchQuery,
    onSearchQueryChange,
    onSearchClear,
    onSearchSubmit,
    placeholder,
    searchAriaLabel,
    status,
    showShortcuts = true,
  },
  ref,
) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20",
        "bg-gradient-to-b from-primary/[0.09] via-primary/[0.03] to-transparent",
        "px-6 py-8 shadow-sm shadow-primary/5 dark:from-primary/[0.14] dark:via-primary/[0.04]",
      )}
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-12 size-40 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="size-5" aria-hidden />
        </div>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
          {showShortcuts ? <DashboardSearchShortcutsHint /> : null}
        </p>

        <div className="mt-6 w-full">
          <DashboardSearchBar
            ref={ref}
            variant="hero"
            value={searchQuery}
            onChange={onSearchQueryChange}
            onClear={onSearchClear}
            onSubmit={onSearchSubmit}
            placeholder={placeholder}
            ariaLabel={searchAriaLabel ?? ariaLabel}
          />
        </div>

        {status ? (
          <div
            className="mt-4 space-y-1 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {status}
          </div>
        ) : null}
      </div>
    </section>
  );
});
