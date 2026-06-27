"use client";

import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InventoryMovementPreset = "in" | "out" | "adjustment";

const QUICK_ACTIONS: Array<{
  type: InventoryMovementPreset;
  label: string;
  hint: string;
  icon: typeof ArrowDownLeft;
  styles: string;
}> = [
  {
    type: "in",
    label: "Entrada",
    hint: "Ingreso a bodega",
    icon: ArrowDownLeft,
    styles:
      "hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-emerald-500/10 data-[active=true]:border-emerald-500/50 data-[active=true]:bg-emerald-500/15 data-[active=true]:ring-emerald-500/25",
  },
  {
    type: "out",
    label: "Salida",
    hint: "Egreso de bodega",
    icon: ArrowUpRight,
    styles:
      "hover:border-red-500/40 hover:bg-red-500/10 hover:shadow-red-500/10 data-[active=true]:border-red-500/50 data-[active=true]:bg-red-500/15 data-[active=true]:ring-red-500/25",
  },
  {
    type: "adjustment",
    label: "Ajuste",
    hint: "Corrección de stock",
    icon: RefreshCw,
    styles:
      "hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-amber-500/10 data-[active=true]:border-amber-500/50 data-[active=true]:bg-amber-500/15 data-[active=true]:ring-amber-500/25",
  },
];

type InventoryMovementHeroProps = {
  batchCount: number;
  movementLineCount: number;
  onRegister: (preset?: InventoryMovementPreset) => void;
  activePreset?: InventoryMovementPreset | null;
  onOpenProductFilter?: () => void;
  hasProductFilter?: boolean;
  productFilterName?: string | null;
  onOpenDateFilter?: () => void;
  hasDateFilter?: boolean;
  dateFilterLabel?: string | null;
};

export function InventoryMovementHero({
  batchCount,
  movementLineCount,
  onRegister,
  activePreset = null,
  onOpenProductFilter,
  hasProductFilter = false,
  productFilterName = null,
  onOpenDateFilter,
  hasDateFilter = false,
  dateFilterLabel = null,
}: InventoryMovementHeroProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-xl shadow-primary/5"
      aria-label="Registrar movimientos de inventario"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] via-background to-primary/[0.12] dark:from-emerald-950/30 dark:via-zinc-950 dark:to-primary/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 40%, rgb(16 185 129 / 0.2) 0%, transparent 42%), radial-gradient(circle at 88% 65%, hsl(var(--primary) / 0.22) 0%, transparent 40%)",
        }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -left-20 top-1/3 size-72 rounded-full bg-emerald-500/15 blur-3xl"
        animate={{ x: [0, 25, 0], y: [0, -15, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-12 bottom-0 size-60 rounded-full bg-primary/15 blur-3xl"
        animate={{ x: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Sparkles className="size-3.5" aria-hidden />
            Comprobante de inventario
          </div>

          <h2 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-br from-foreground via-foreground to-emerald-600 bg-clip-text text-transparent dark:to-emerald-400">
              Registrá entradas,
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-primary to-blue-500 bg-clip-text text-transparent dark:from-emerald-400">
              salidas o ajustes
            </span>
          </h2>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Cada guardado genera un comprobante con uno o varios productos. Elegí el tipo de
            movimiento o empezá directo.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ type, label, hint, icon: Icon, styles }) => (
              <button
                key={type}
                type="button"
                data-active={activePreset === type}
                onClick={() => onRegister(type)}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all",
                  "border-border/60 bg-background/60 backdrop-blur-sm hover:shadow-md",
                  "data-[active=true]:ring-1",
                  styles,
                )}
              >
                <Icon
                  className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground group-data-[active=true]:text-foreground"
                  aria-hidden
                />
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {hint}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/80">
            <ClipboardList className="size-3.5 shrink-0" aria-hidden />
            Podés agregar varias líneas en un solo comprobante
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div
            className="pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-gradient-to-r from-emerald-500/35 via-primary/30 to-blue-500/35 opacity-60 blur-xl dark:opacity-40"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-background/55 p-5 shadow-2xl shadow-primary/10 backdrop-blur-xl dark:bg-zinc-950/55 sm:p-6">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
              aria-hidden
            />

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nuevo movimiento
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Abrí el formulario, cargá productos y guardá. El stock se actualiza al instante.
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={() => onRegister()}
                className="h-14 w-full rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-primary text-base font-bold text-primary-foreground shadow-lg shadow-emerald-500/20 hover:from-emerald-600/92 hover:to-primary/92 hover:shadow-xl hover:shadow-emerald-500/25"
              >
                <Plus className="size-5" aria-hidden />
                Registrar movimientos
              </Button>

              <div className="flex flex-wrap items-center gap-2" role="status">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                  <FileText className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="tabular-nums">
                    {batchCount} comprobante{batchCount === 1 ? "" : "s"}
                    {movementLineCount > 0
                      ? ` · ${movementLineCount} línea${movementLineCount === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </span>
                {onOpenDateFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenDateFilter}
                    className={cn(
                      "h-8 rounded-full border-border/60 bg-background/50 px-3 text-xs backdrop-blur-sm",
                      hasDateFilter &&
                        "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                    )}
                  >
                    <Calendar className="size-3.5" aria-hidden />
                    {hasDateFilter ? (dateFilterLabel ?? "Fecha filtrada") : "Filtrar por fecha"}
                  </Button>
                ) : null}
                {onOpenProductFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenProductFilter}
                    className={cn(
                      "h-8 rounded-full border-border/60 bg-background/50 px-3 text-xs backdrop-blur-sm",
                      hasProductFilter &&
                        "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                    )}
                  >
                    {hasProductFilter ? (
                      <>
                        <Filter className="size-3.5" aria-hidden />
                        {productFilterName ?? "Producto filtrado"}
                      </>
                    ) : (
                      <>
                        <Search className="size-3.5" aria-hidden />
                        Buscar por producto
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
