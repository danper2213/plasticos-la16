"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const productCardStyles = {
  article:
    "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
  header:
    "border-b border-border/70 bg-muted/30 px-5 py-4 dark:bg-muted/20",
  body: "flex flex-col gap-3 p-5",
  footer:
    "flex justify-end gap-1.5 border-t border-border/70 bg-muted/20 px-5 py-3 dark:bg-muted/15",
  label:
    "text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
  value: "text-sm font-bold leading-tight text-foreground",
  valueLg: "text-lg font-black tabular-nums leading-none",
  panel:
    "relative flex min-w-0 overflow-hidden rounded-xl border border-border/70 bg-muted/25 text-left dark:bg-muted/20",
  panelAccent: "absolute inset-y-0 left-0 w-1 bg-primary/75",
  iconWrap:
    "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
} as const;

type ProductInfoPanelProps = {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  emphasized?: boolean;
  valueClassName?: string;
  onClick?: () => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
};

export function ProductInfoPanel({
  icon: Icon,
  label,
  children,
  emphasized = false,
  valueClassName,
  onClick,
  ariaLabel,
  title,
  className,
}: ProductInfoPanelProps) {
  const interactive = Boolean(onClick);

  const panelClassName = cn(
    productCardStyles.panel,
    "w-full items-stretch transition-all",
    emphasized && "border-primary/30 bg-primary/[0.06] dark:bg-primary/[0.08]",
    interactive &&
      "cursor-pointer hover:-translate-y-px hover:border-primary/35 hover:shadow-sm hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
    className,
  );

  const content = (
    <>
      <div className={productCardStyles.panelAccent} aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-3.5">
        <div className={productCardStyles.iconWrap} aria-hidden>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={productCardStyles.label}>{label}</p>
          <div className={cn(productCardStyles.value, valueClassName)}>
            {children}
          </div>
        </div>
      </div>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={panelClassName}
        onClick={onClick}
        aria-label={ariaLabel}
        title={title}
      >
        {content}
      </button>
    );
  }

  return <div className={panelClassName}>{content}</div>;
}

type ProductDetailFieldProps = {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
  className?: string;
};

/** Campo secundario: sin barra lateral ni icono grande. */
export function ProductDetailField({
  label,
  children,
  valueClassName,
  className,
}: ProductDetailFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/85">
        {label}
      </p>
      <div
        className={cn(
          "mt-0.5 truncate text-sm font-medium leading-snug text-foreground/90",
          valueClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type ProductDetailsSectionProps = {
  children: React.ReactNode;
  className?: string;
};

/** Contenedor ligero para datos secundarios de la tarjeta. */
export function ProductDetailsSection({
  children,
  className,
}: ProductDetailsSectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/10 px-4 py-3.5 dark:bg-muted/10",
        className,
      )}
    >
      {children}
    </div>
  );
}
