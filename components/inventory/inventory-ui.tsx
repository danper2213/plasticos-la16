"use client";

import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InventoryPanelProps = ComponentProps<"div"> & {
  variant?: "default" | "muted" | "dashed";
};

/** Superficie glass suave — misma familia visual que el hero, menos intensa. */
export function InventoryPanel({
  className,
  variant = "default",
  children,
  ...props
}: InventoryPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        variant === "default" &&
          "border-primary/10 bg-background/45 backdrop-blur-md dark:bg-zinc-950/45",
        variant === "muted" &&
          "border-border/60 bg-muted/15 backdrop-blur-sm dark:bg-muted/10",
        variant === "dashed" &&
          "border-dashed border-primary/20 bg-background/30 backdrop-blur-sm dark:bg-zinc-950/30",
        className,
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 100% 0%, hsl(var(--primary) / 0.06) 0%, transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

type InventorySectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  badge?: ReactNode;
  className?: string;
};

export function InventorySectionHeader({
  icon: Icon,
  title,
  badge,
  className,
}: InventorySectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {badge}
    </div>
  );
}

type InventoryFilterLabelProps = {
  icon: LucideIcon;
  children: ReactNode;
};

export function InventoryFilterLabel({ icon: Icon, children }: InventoryFilterLabelProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3.5 text-primary/70" aria-hidden />
      {children}
    </div>
  );
}

const MOVEMENT_CHIP_STYLES: Record<string, string> = {
  in: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  out: "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-300",
  adjustment: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300",
};

export function InventoryMovementChip({
  movementType,
  children,
  className,
}: {
  movementType?: string;
  children: ReactNode;
  className?: string;
}) {
  const key = movementType ?? "";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        MOVEMENT_CHIP_STYLES[key] ?? "border-border/60 bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function inventoryFilterButtonClass(active: boolean): string {
  return cn(
    "rounded-xl transition-all",
    active
      ? "border-0 bg-primary text-primary-foreground shadow-sm shadow-primary/20"
      : "border-border/60 bg-background/50 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5",
  );
}
