"use client";

import { forwardRef, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Plus,
  Receipt,
  Sparkles,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashboardSearchBar,
  type DashboardSearchBarHandle,
} from "@/components/layout/dashboard-search-bar";
import {
  DashboardFeatureHeroBadge,
  DashboardFeatureHeroPanel,
  DashboardFeatureHeroShell,
} from "@/components/layout/dashboard-feature-hero-shell";
import {
  DashboardFilterChips,
  type ActiveFilterChip,
} from "@/components/layout/dashboard-filter-chips";
import { MonthPaginator } from "@/components/payables/month-paginator";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";

type QuickFilter = "all" | "pending" | "under3m";

const SEARCH_EXAMPLES = ["FE-1234", "proveedor", "factura", "12345"] as const;

const QUICK_FILTERS: Array<{
  id: QuickFilter;
  label: string;
  hint: string;
  icon: typeof Clock;
}> = [
  { id: "all", label: "Todos", hint: "Mes", icon: FileText },
  { id: "pending", label: "Pendientes", hint: "Por pagar", icon: Clock },
  { id: "under3m", label: "Menores a $3M", hint: "Monto", icon: Wallet },
];

type PayablesSearchHeroProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  month: number;
  year: number;
  monthName: string;
  monthKey: string;
  todayLabel: string;
  pendingDueToday: number;
  quickFilter: QuickFilter;
  onQuickFilterChange: (value: QuickFilter) => void;
  supplierFilter: string;
  onSupplierFilterChange: (value: string) => void;
  uniqueSuppliers: string[];
  filterChips: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  hasActiveFilters: boolean;
  isSearching: boolean;
  filteredCount: number;
  totalCount: number;
  totalPorPagar: number;
  totalPagado: number;
  metaPercent: number;
  paidInMonth: number;
  totalInMonth: number;
  pendingInMonth: number;
  onNewInvoice: () => void;
};

function StatCard({
  label,
  icon: Icon,
  iconClassName,
  valueClassName,
  children,
}: {
  label: string;
  icon: typeof Wallet;
  iconClassName?: string;
  valueClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/45 p-3.5 shadow-sm backdrop-blur-md dark:bg-zinc-950/40 sm:p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("size-3.5 shrink-0", iconClassName)} aria-hidden />
        {label}
      </p>
      <div className={cn("text-lg font-black tabular-nums sm:text-xl", valueClassName)}>
        {children}
      </div>
    </div>
  );
}

export const PayablesSearchHero = forwardRef<DashboardSearchBarHandle, PayablesSearchHeroProps>(
  function PayablesSearchHero(
    {
      searchQuery,
      onSearchQueryChange,
      onSearchClear,
      onSearchSubmit,
      month,
      year,
      monthName,
      monthKey,
      todayLabel,
      pendingDueToday,
      quickFilter,
      onQuickFilterChange,
      supplierFilter,
      onSupplierFilterChange,
      uniqueSuppliers,
      filterChips,
      onClearAllFilters,
      hasActiveFilters,
      isSearching,
      filteredCount,
      totalCount,
      totalPorPagar,
      totalPagado,
      metaPercent,
      paidInMonth,
      totalInMonth,
      pendingInMonth,
      onNewInvoice,
    },
    ref,
  ) {
    const titleSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
    const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });

    return (
      <DashboardFeatureHeroShell
        ariaLabel="Cuentas por pagar"
        left={
          <>
            <DashboardFeatureHeroBadge>
              <Sparkles className="size-3.5" aria-hidden />
              Control de pagos
            </DashboardFeatureHeroBadge>

            <h2 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
                Cuentas por pagar
              </span>
              <br />
              <span className="inline-flex min-h-[1.1em] items-baseline bg-gradient-to-r from-primary via-blue-500 to-violet-500 bg-clip-text text-transparent">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={monthKey}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={titleSpring}
                    className="inline-block capitalize"
                  >
                    {monthName} {year}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h2>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              <Calendar className="mb-0.5 mr-1.5 inline size-3.5 shrink-0 text-primary/70" aria-hidden />
              Hoy es{" "}
              <span className="font-medium text-foreground/90">{todayLabel}</span>
              {pendingDueToday > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {pendingDueToday} vencen hoy
                  </span>
                </>
              ) : null}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Suspense
                fallback={
                  <div className="h-9 w-full max-w-xs animate-pulse rounded-xl bg-muted/60 sm:w-64" />
                }
              >
                <MonthPaginator />
              </Suspense>
              <Button
                type="button"
                onClick={onNewInvoice}
                className="h-11 w-full gap-2 rounded-xl border-0 bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/25 sm:w-auto"
              >
                <Plus className="size-4" aria-hidden />
                Nueva Factura
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_FILTERS.map(({ id, label, hint, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onQuickFilterChange(id === "under3m" && quickFilter === "under3m" ? "all" : id)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all",
                    "border-border/60 bg-background/60 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
                    quickFilter === id && "border-primary/50 bg-primary/15 ring-1 ring-primary/25",
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
            </div>

            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/80">
              <Receipt className="size-3.5 shrink-0" aria-hidden />
              Arrastrá facturas en el calendario para cambiar vencimientos
            </p>
          </>
        }
        right={
          <DashboardFeatureHeroPanel>
            <DashboardSearchBar
              ref={ref}
              variant="hero"
              align="start"
              alwaysExpanded
              value={searchQuery}
              onChange={onSearchQueryChange}
              onClear={onSearchClear}
              onSubmit={onSearchSubmit}
              placeholder="Buscar por proveedor o número de factura…"
              rotatingPlaceholder={SEARCH_EXAMPLES}
              ariaLabel="Buscar factura o proveedor"
            />

            <div className="mt-4 space-y-3" role="status" aria-live="polite">
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
                    {hasActiveFilters ? filteredCount : totalCount} factura
                    {(hasActiveFilters ? filteredCount : totalCount) === 1 ? "" : "s"}
                    {hasActiveFilters ? " · filtrado" : ""}
                    {isSearching ? " · búsqueda" : ""}
                    {" · "}
                    {monthLabel}
                  </span>
                </span>

                <Select value={supplierFilter} onValueChange={onSupplierFilterChange}>
                  <SelectTrigger
                    className={cn(
                      "h-8 w-full max-w-[220px] rounded-full border-border/60 bg-background/50 px-3 text-xs backdrop-blur-sm sm:w-auto",
                      supplierFilter !== "all" &&
                        "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
                    )}
                  >
                    <Filter className="mr-1.5 size-3.5 shrink-0" aria-hidden />
                    <SelectValue placeholder="Proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {uniqueSuppliers.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterChips.length > 0 ? (
                <DashboardFilterChips chips={filterChips} onClearAll={onClearAllFilters} />
              ) : null}
            </div>
          </DashboardFeatureHeroPanel>
        }
        below={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total por pagar"
              icon={Wallet}
              iconClassName="text-amber-500 dark:text-amber-400/80"
              valueClassName="text-amber-600 dark:text-amber-400"
            >
              {formatCop(totalPorPagar)}
            </StatCard>
            <StatCard
              label="Total pagado"
              icon={CheckCircle2}
              iconClassName="text-emerald-500 dark:text-emerald-400"
              valueClassName="text-emerald-600 dark:text-emerald-400"
            >
              {formatCop(totalPagado)}
            </StatCard>
            <StatCard
              label="Estado de meta"
              icon={Target}
              iconClassName="text-emerald-500 dark:text-emerald-400"
            >
              <div className="flex items-center gap-2">
                <Progress
                  value={paidInMonth}
                  max={totalInMonth || 1}
                  className="h-2 flex-1 bg-muted/80 [&>div]:bg-emerald-500"
                />
                <span className="w-10 text-right text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {metaPercent}%
                </span>
              </div>
            </StatCard>
            <StatCard label="Resumen del mes" icon={FileText}>
              <span className="text-foreground">
                {totalInMonth} registrada{totalInMonth === 1 ? "" : "s"}
                <span className="text-muted-foreground"> · </span>
                {pendingInMonth} pendiente{pendingInMonth === 1 ? "" : "s"}
              </span>
            </StatCard>
          </div>
        }
      />
    );
  },
);
