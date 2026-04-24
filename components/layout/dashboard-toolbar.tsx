import * as React from "react";
import { cn } from "@/lib/utils";

/** Superficie de barra de filtros / herramientas (misma línea visual que Lista de Precios). */
export function DashboardToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/70 p-3 shadow-sm backdrop-blur-sm dark:border-border dark:bg-muted/35",
        className,
      )}
      {...props}
    />
  );
}

/** Contenedor del buscador con foco anillado (primario). */
export function DashboardToolbarSearchShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative min-h-[2.5rem] w-full min-w-0 flex-1 rounded-lg border border-input/90 bg-background shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-input",
        className,
      )}
      {...props}
    />
  );
}

/** Caja de total / resumen a la derecha de la barra. */
export function DashboardToolbarStat({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-xl border border-border/80 bg-background/90 px-4 py-2 shadow-sm dark:border-border dark:bg-card/80",
        className,
      )}
      {...props}
    />
  );
}
