"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Camera,
  ClipboardList,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardFeatureHeroBadge,
  DashboardFeatureHeroPanel,
  DashboardFeatureHeroShell,
  DashboardFeatureHeroTitle,
} from "@/components/layout/dashboard-feature-hero-shell";
import {
  DashboardFilterChips,
  type ActiveFilterChip,
} from "@/components/layout/dashboard-filter-chips";
import { cn } from "@/lib/utils";

export type InventoryMovementPreset = "in" | "out" | "adjustment";

const QUICK_ACTIONS: Array<{
  type: InventoryMovementPreset;
  label: string;
  hint: string;
  icon: typeof ArrowDownLeft;
  activeRing: string;
}> = [
  {
    type: "in",
    label: "Entrada",
    hint: "Ingreso",
    icon: ArrowDownLeft,
    activeRing: "border-emerald-500/50 bg-emerald-500/15 ring-emerald-500/25",
  },
  {
    type: "out",
    label: "Salida",
    hint: "Egreso",
    icon: ArrowUpRight,
    activeRing: "border-red-500/50 bg-red-500/15 ring-red-500/25",
  },
  {
    type: "adjustment",
    label: "Ajuste",
    hint: "Corrección",
    icon: RefreshCw,
    activeRing: "border-amber-500/50 bg-amber-500/15 ring-amber-500/25",
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
  filterChips?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  hasActiveFilters?: boolean;
  onOpenFormats?: () => void;
  onOpenScan?: () => void;
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
  filterChips = [],
  onClearAllFilters,
  hasActiveFilters = false,
  onOpenFormats,
  onOpenScan,
}: InventoryMovementHeroProps) {
  const hasListFilters = hasProductFilter || hasDateFilter;

  return (
    <DashboardFeatureHeroShell
      ariaLabel="Registrar movimientos de inventario"
      left={
        <>
          <DashboardFeatureHeroBadge>
            <Sparkles className="size-3.5" aria-hidden />
            Control de inventario
          </DashboardFeatureHeroBadge>

          <DashboardFeatureHeroTitle
            line1="Registrá entradas,"
            line2="salidas o ajustes"
          />

          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Cada guardado genera un comprobante con uno o varios productos. Cargá la foto de
            una lista a mano, imprimí un formato, o registrá el movimiento vos.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ type, label, hint, icon: Icon, activeRing }) => (
              <button
                key={type}
                type="button"
                data-active={activePreset === type}
                onClick={() => onRegister(type)}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all",
                  "border-border/60 bg-background/60 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
                  activePreset === type && cn("ring-1", activeRing),
                )}
              >
                <Icon
                  className="size-3.5 shrink-0 text-primary/70 group-hover:text-primary"
                  aria-hidden
                />
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {hint}
                </span>
              </button>
            ))}
            {onOpenFormats ? (
              <button
                type="button"
                onClick={onOpenFormats}
                className="group inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-left text-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10"
              >
                <Printer className="size-3.5 shrink-0 text-primary/70 group-hover:text-primary" />
                <span className="font-medium text-foreground">Formatos</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Imprimir
                </span>
              </button>
            ) : null}
            {onOpenScan ? (
              <button
                type="button"
                onClick={onOpenScan}
                className="group inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-left text-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10"
              >
                <Camera className="size-3.5 shrink-0 text-primary/70 group-hover:text-primary" />
                <span className="font-medium text-foreground">Leer foto</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Foto
                </span>
              </button>
            ) : null}
          </div>

          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/80">
            <ClipboardList className="size-3.5 shrink-0" aria-hidden />
            Podés agregar varias líneas en un solo comprobante
          </p>
        </>
      }
      right={
        <DashboardFeatureHeroPanel>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Historial y filtros
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Filtrá comprobantes por producto o fecha. El stock se actualiza al registrar.
              </p>
            </div>

            <div className="space-y-3" role="status" aria-live="polite">
              <div className="flex flex-wrap items-center justify-start gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm",
                    hasActiveFilters
                      ? "border-primary/30 bg-primary/15 font-semibold text-primary shadow-sm shadow-primary/10"
                      : "border-border/60 bg-background/50 text-muted-foreground",
                  )}
                >
                  <Zap className="size-3.5" aria-hidden />
                  <span className="tabular-nums">
                    {batchCount} comprobante{batchCount === 1 ? "" : "s"}
                    {movementLineCount > 0
                      ? ` · ${movementLineCount} línea${movementLineCount === 1 ? "" : "s"}`
                      : ""}
                    {hasActiveFilters ? " · filtrado" : ""}
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
                    {hasDateFilter ? (dateFilterLabel ?? "Fecha") : "Filtrar por fecha"}
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
                        {productFilterName ?? "Producto"}
                      </>
                    ) : (
                      <>
                        <Search className="size-3.5" aria-hidden />
                        Filtrar por producto
                      </>
                    )}
                  </Button>
                ) : null}
              </div>

              {filterChips.length > 0 ? (
                <DashboardFilterChips chips={filterChips} onClearAll={onClearAllFilters} />
              ) : hasListFilters ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3.5 shrink-0 text-primary/70" aria-hidden />
                  Filtros activos en el listado
                </div>
              ) : null}
            </div>
          </div>
        </DashboardFeatureHeroPanel>
      }
    />
  );
}
