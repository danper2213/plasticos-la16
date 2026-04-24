"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileDown,
  FolderOpen,
  History,
  Loader2,
  Package,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quoteLineTotal, unitPriceFromCostAndUtilityPercent } from "@/lib/quotes/pricing";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { deleteQuote, getQuoteById, saveQuote, searchProductsForQuote } from "./actions";
import type { ProductQuoteSearchHit, QuoteListItem } from "./quote-types";

const inputClassName =
  "rounded-xl h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary transition-shadow";

const UTILITY_PRESETS = [10, 15, 20, 25] as const;
const DEFAULT_UTILITY_PERCENT = 20;

interface CustomerOption {
  id: string;
  name: string;
}

interface DraftLine {
  key: string;
  product_id: string | null;
  product_name: string;
  presentation: string;
  quantity: number;
  unit_cost: number;
  list_unit_price: number;
}

interface CotizacionesClientProps {
  customers: CustomerOption[];
  recentQuotes: QuoteListItem[];
}

function newLineKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-black text-primary shadow-inner ring-1 ring-primary/20 dark:from-blue-500/30 dark:to-blue-500/5 dark:text-blue-300 dark:ring-blue-500/25"
        aria-hidden
      >
        {n}
      </span>
      <div>
        <h2 className="text-base font-bold tracking-tight text-foreground">{label}</h2>
      </div>
    </div>
  );
}

export function CotizacionesClient({ customers, recentQuotes }: CotizacionesClientProps) {
  const router = useRouter();
  const [quoteId, setQuoteId] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [customerName, setCustomerName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [defaultUtilityPercent, setDefaultUtilityPercent] = React.useState(DEFAULT_UTILITY_PERCENT);
  const [lines, setLines] = React.useState<DraftLine[]>([]);

  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [productSearchResults, setProductSearchResults] = React.useState<ProductQuoteSearchHit[]>([]);
  const [productSearching, setProductSearching] = React.useState(false);
  const productSearchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [loadingQuoteId, setLoadingQuoteId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<{ id: string; label: string } | null>(null);
  const [deletingQuote, setDeletingQuote] = React.useState(false);

  React.useEffect(() => {
    const q = productSearchQuery.trim();
    if (q.length < 2) {
      setProductSearchResults([]);
      return;
    }
    if (productSearchDebounce.current) clearTimeout(productSearchDebounce.current);
    productSearchDebounce.current = setTimeout(() => {
      setProductSearching(true);
      searchProductsForQuote(q).then((res) => {
        setProductSearchResults(res);
        setProductSearching(false);
      });
    }, 280);
    return () => {
      if (productSearchDebounce.current) clearTimeout(productSearchDebounce.current);
    };
  }, [productSearchQuery]);

  function resetForm(options?: { skipToast?: boolean }) {
    setQuoteId(null);
    setCustomerId(null);
    setCustomerName("");
    setNotes("");
    setValidUntil("");
    setDefaultUtilityPercent(DEFAULT_UTILITY_PERCENT);
    setLines([]);
    setProductSearchQuery("");
    setProductSearchResults([]);
    if (!options?.skipToast) {
      toast.message("Listo para una cotización nueva");
    }
  }

  function handleSelectCustomer(value: string) {
    if (value === "__none__") {
      setCustomerId(null);
      return;
    }
    setCustomerId(value);
    const c = customers.find((x) => x.id === value);
    if (c) setCustomerName(c.name);
  }

  function addProduct(hit: ProductQuoteSearchHit) {
    const unitCost = Math.max(0, hit.cost);
    const list = unitPriceFromCostAndUtilityPercent(unitCost, defaultUtilityPercent);
    setLines((prev) => [
      ...prev,
      {
        key: newLineKey(),
        product_id: hit.id,
        product_name: hit.name,
        presentation: hit.presentation,
        quantity: 1,
        unit_cost: unitCost,
        list_unit_price: list,
      },
    ]);
    setProductSearchQuery("");
    setProductSearchResults([]);
    toast.success(`${hit.name} agregado`);
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  /** Al cambiar la utilidad, recalcula el precio unitario de todas las filas a partir del costo. */
  function setUtilityPercentAndRecalcLines(rawPercent: number) {
    const clamped = Math.min(
      500,
      Math.max(0, Number.isFinite(rawPercent) ? rawPercent : DEFAULT_UTILITY_PERCENT),
    );
    setDefaultUtilityPercent(clamped);
    setLines((prev) =>
      prev.length === 0
        ? prev
        : prev.map((l) => ({
            ...l,
            list_unit_price: unitPriceFromCostAndUtilityPercent(l.unit_cost, clamped),
          })),
    );
  }

  async function handleLoadQuote(id: string) {
    setLoadingQuoteId(id);
    try {
      const detail = await getQuoteById(id);
      if (!detail) {
        toast.error("No se encontró la cotización");
        return;
      }
      setQuoteId(detail.id);
      setCustomerId(detail.customer_id);
      setCustomerName(detail.customer_name);
      setNotes(detail.notes ?? "");
      setValidUntil(detail.valid_until ?? "");
      setDefaultUtilityPercent(detail.default_utility_percent ?? DEFAULT_UTILITY_PERCENT);
      setLines(
        detail.lines.map((l) => ({
          key: l.id,
          product_id: l.product_id,
          product_name: l.product_name,
          presentation: l.presentation,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          list_unit_price: l.list_unit_price,
        })),
      );
      toast.success("Cotización cargada en el editor");
    } finally {
      setLoadingQuoteId(null);
    }
  }

  async function handleSave() {
    const name = customerName.trim();
    if (!name) {
      toast.error("Indique el nombre del cliente");
      return;
    }
    if (lines.length === 0) {
      toast.error("Agregue al menos un producto");
      return;
    }

    setSaving(true);
    try {
      const result = await saveQuote({
        id: quoteId ?? undefined,
        customer_id: customerId,
        customer_name: name,
        notes: notes.trim() || undefined,
        valid_until: validUntil.trim() || null,
        default_utility_percent: defaultUtilityPercent,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          presentation: l.presentation,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          list_unit_price: l.list_unit_price,
        })),
      });
      if (!result.success) {
        toast.error(result.error ?? "Error al guardar");
        return;
      }
      setQuoteId(result.id);
      toast.success("Cotización guardada");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeleteQuote() {
    if (!pendingDelete) return;
    setDeletingQuote(true);
    try {
      const result = await deleteQuote(pendingDelete.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Cotización eliminada");
      if (quoteId === pendingDelete.id) {
        resetForm({ skipToast: true });
      }
      setPendingDelete(null);
      router.refresh();
    } finally {
      setDeletingQuote(false);
    }
  }

  const total = lines.reduce((s, l) => s + quoteLineTotal(l.list_unit_price, l.quantity), 0);

  const pdfHref = quoteId ? `/api/quotes/${quoteId}/pdf` : null;
  const searchActive = productSearchQuery.trim().length >= 2;

  return (
    <div className="space-y-7 pb-12">
      <DashboardPageHeader
        icon={PackageSearch}
        title="Cotizaciones"
        badge={
          quoteId ? (
            <Badge className="rounded-lg border-0 bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary dark:bg-blue-500/20 dark:text-blue-300">
              Guardada · {quoteId.slice(0, 8)}…
            </Badge>
          ) : undefined
        }
        description={
          <>
            Defina la{" "}
            <span className="font-medium text-slate-800 dark:text-zinc-200">utilidad sobre costo</span> (por defecto
            20%). Cada
            producto nuevo parte de ese cálculo; luego puede afinar costo y precio en la tabla.
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border/80 bg-background/90 backdrop-blur-sm gap-2 h-11 shadow-sm"
              onClick={() => resetForm()}
            >
              <RefreshCw className="size-4" />
              Nueva cotización
            </Button>
            {quoteId ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-destructive/35 bg-background/90 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 h-11 shadow-sm"
                onClick={() =>
                  setPendingDelete({
                    id: quoteId,
                    label: customerName.trim() || "esta cotización",
                  })
                }
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            ) : null}
            {pdfHref ? (
              <Button type="button" variant="outline" className="rounded-xl gap-2 h-11 bg-background/90 shadow-sm" asChild>
                <Link href={pdfHref} target="_blank" rel="noopener noreferrer">
                  <FileDown className="size-4" />
                  Descargar PDF
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              className="rounded-xl gap-2 h-11 px-6 font-semibold shadow-lg shadow-primary/25"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Guardando…" : "Guardar cotización"}
            </Button>
          </>
        }
        footer={
          lines.length > 0 ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">
                {lines.length} {lines.length === 1 ? "ítem" : "ítems"}
              </span>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total</span>
                <div className="text-xl font-black tabular-nums text-primary sm:text-2xl tracking-tight">{formatCop(total)}</div>
              </div>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-7 min-w-0">
          <Card className="overflow-hidden rounded-[1.25rem] border-border/60 shadow-md dark:border-zinc-800/80">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent pb-4 dark:from-zinc-900/40">
              <StepBadge n={1} label="Cliente y condiciones" />
              <CardDescription className="pl-[3.25rem] text-sm leading-relaxed">
                Vincule un cliente o escriba el nombre para el PDF. Opcional: validez y notas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <UserRound className="size-3.5 text-primary shrink-0" aria-hidden />
                    Cliente registrado
                  </Label>
                  <Select value={customerId ?? "__none__"} onValueChange={handleSelectCustomer}>
                    <SelectTrigger className={cn(inputClassName, "h-11")}>
                      <SelectValue placeholder="Opcional — seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin vincular (solo nombre abajo)</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nombre en cotización y PDF
                  </Label>
                  <Input
                    className={cn(inputClassName, "h-11")}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej. Distribuidora del Norte S.A.S."
                  />
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Válida hasta</Label>
                <Input type="date" className={cn(inputClassName, "h-11")} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas</Label>
                <Textarea
                  className="rounded-xl border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/25 min-h-[88px] resize-none text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Plazo de entrega, forma de pago, observaciones…"
                />
              </div>
            </CardContent>
          </Card>

          <section
            className="relative overflow-hidden rounded-[1.35rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.09] via-card to-sky-500/[0.06] p-5 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] sm:p-6 dark:from-emerald-950/40 dark:via-zinc-950 dark:to-sky-950/25 dark:border-emerald-500/15"
            aria-labelledby="utility-heading"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-400/15 blur-2xl dark:bg-emerald-500/10" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-1/3 size-32 rounded-full bg-sky-400/10 blur-2xl dark:bg-sky-500/10" aria-hidden />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3.5 min-w-0">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-sky-500/15 text-emerald-700 shadow-inner ring-1 ring-emerald-500/25 dark:from-emerald-500/35 dark:to-sky-500/20 dark:text-emerald-200 dark:ring-emerald-400/20">
                  <TrendingUp className="size-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                    <h3 id="utility-heading" className="text-sm font-black uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
                      Utilidad sobre costo
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
                    Precio en tabla:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      costo × (1 + {Number.isFinite(defaultUtilityPercent) ? defaultUtilityPercent : DEFAULT_UTILITY_PERCENT}%)
                    </span>
                    . Al cambiar el porcentaje (botones o campo) los precios unitarios de todas las filas se recalculan automáticamente; puede seguir editando fila a fila.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
              <div
                className="inline-flex items-center gap-1 rounded-2xl border border-emerald-500/25 bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur-sm dark:bg-zinc-900/70 dark:border-emerald-500/20"
                title="Porcentaje de utilidad"
              >
                <span className="pl-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">Otro %</span>
                <Input
                  type="number"
                  step={0.5}
                  min={0}
                  max={500}
                  className="h-9 w-[4.5rem] border-0 bg-transparent text-center text-base font-black tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
                  value={Number.isFinite(defaultUtilityPercent) ? defaultUtilityPercent : DEFAULT_UTILITY_PERCENT}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setUtilityPercentAndRecalcLines(Number.isFinite(v) ? v : DEFAULT_UTILITY_PERCENT);
                  }}
                  aria-label="Porcentaje de utilidad personalizado"
                />
                <span className="pr-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">%</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {UTILITY_PRESETS.map((p) => {
                  const active = defaultUtilityPercent === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setUtilityPercentAndRecalcLines(p)}
                      className={cn(
                        "min-h-11 min-w-[3.25rem] rounded-xl px-4 text-sm font-black tabular-nums transition-all duration-200",
                        active
                          ? "bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/35 ring-2 ring-emerald-400/50 dark:from-emerald-500 dark:to-emerald-600"
                          : "bg-background/90 text-muted-foreground ring-1 ring-border/60 hover:bg-muted hover:text-foreground dark:bg-zinc-900/80 dark:ring-zinc-700 dark:hover:bg-zinc-800",
                      )}
                    >
                      {p}%
                    </button>
                  );
                })}
              </div>

            </div>
          </section>

          <Card className="overflow-hidden rounded-[1.25rem] border-border/60 shadow-md dark:border-zinc-800/80">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent pb-4 dark:from-zinc-900/40">
              <StepBadge n={2} label="Buscar productos" />
              <CardDescription className="pl-[3.25rem] text-sm leading-relaxed">
                Mínimo dos caracteres. Vista previa con utilidad{" "}
                <span className="font-semibold text-foreground tabular-nums">{defaultUtilityPercent}%</span>. Toque para
                agregar al detalle.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="relative group">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  className={cn(
                    inputClassName,
                    "h-12 pl-11 text-base shadow-sm ring-offset-background transition-shadow group-focus-within:ring-2 group-focus-within:ring-primary/20",
                  )}
                  placeholder="Ej. bolsa, caja, tapa…"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  aria-label="Buscar producto"
                />
              </div>
              {!searchActive ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex rounded-lg border border-border/80 bg-muted/50 px-2 py-0.5 font-mono text-[10px] font-semibold">
                    2+
                  </span>
                  caracteres para buscar en nombre y presentación.
                </p>
              ) : null}

              {searchActive ? (
                <div className="rounded-[1.15rem] border border-border/70 bg-card/95 shadow-lg overflow-hidden backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/60">
                  {productSearching ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                      Buscando en el catálogo…
                    </div>
                  ) : productSearchResults.length === 0 ? (
                    <div className="py-12 px-4 text-center text-sm text-muted-foreground">No hay coincidencias. Pruebe otra palabra.</div>
                  ) : (
                    <ul className="divide-y divide-border/50 dark:divide-zinc-800/80">
                      {productSearchResults.map((p) => {
                        const preview = unitPriceFromCostAndUtilityPercent(p.cost, defaultUtilityPercent);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="group flex w-full items-stretch gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/10"
                              onClick={() => addProduct(p)}
                            >
                              <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-sky-500/10 text-emerald-700 ring-1 ring-emerald-500/20 group-hover:from-emerald-500/25 dark:from-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-500/30">
                                <Plus className="size-5" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1 py-0.5">
                                <span className="font-bold text-foreground block leading-snug">{p.name}</span>
                                <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                                  {p.presentation || "—"}
                                  {p.category_name ? ` · ${p.category_name}` : ""}
                                </span>
                                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
                                  <span>
                                    Costo: <span className="font-semibold text-foreground">{formatCop(p.cost)}</span>
                                  </span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    +{defaultUtilityPercent}% → {formatCop(preview)}
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 flex flex-col items-end justify-center pr-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">P. unit.</span>
                                <span className="text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                                  {formatCop(preview)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.25rem] border-border/60 shadow-md dark:border-zinc-800/80">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent pb-4 dark:from-zinc-900/40">
              <StepBadge n={3} label="Detalle y precios" />
              <CardDescription className="pl-[3.25rem] text-sm leading-relaxed">
                Ajuste costo, precio unitario y cantidad. El subtotal es precio × cantidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {lines.length === 0 ? (
                <div className="mx-4 my-8 sm:mx-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-6 py-16 text-center dark:from-zinc-900/30">
                  <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted/80 dark:bg-zinc-800">
                    <Package className="size-7 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="text-sm font-bold text-foreground">Aún no hay productos</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
                    Busque en el paso 2. El precio parte con su utilidad del {defaultUtilityPercent}%.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 md:hidden">
                    {lines.map((l) => {
                      const sub = quoteLineTotal(l.list_unit_price, l.quantity);
                      return (
                        <div
                          key={l.key}
                          className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3 dark:border-zinc-800"
                        >
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm leading-snug">{l.product_name}</p>
                              {l.presentation ? (
                                <p className="text-xs text-muted-foreground mt-0.5">{l.presentation}</p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 size-9 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLine(l.key)}
                              aria-label="Quitar producto"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Costo u.</Label>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                className={cn(inputClassName, "h-10 text-right font-medium tabular-nums")}
                                value={l.unit_cost}
                                onChange={(e) =>
                                  updateLine(l.key, { unit_cost: Math.max(0, parseFloat(e.target.value) || 0) })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">P. unit.</Label>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                className={cn(inputClassName, "h-10 text-right font-bold tabular-nums text-emerald-800 dark:text-emerald-200")}
                                value={l.list_unit_price}
                                onChange={(e) =>
                                  updateLine(l.key, {
                                    list_unit_price: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Cantidad</Label>
                            <Input
                              type="number"
                              min={0.0001}
                              step="any"
                              className={cn(inputClassName, "h-10 text-right tabular-nums")}
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.key, { quantity: Math.max(0.0001, parseFloat(e.target.value) || 0) })
                              }
                            />
                          </div>
                          <div className="flex justify-between items-baseline pt-2 border-t border-border/50">
                            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Subtotal</span>
                            <span className="text-lg font-black tabular-nums text-primary">{formatCop(sub)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden md:block w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="[&_tr]:border-b border-border/50 bg-gradient-to-r from-muted/50 to-muted/20 dark:from-zinc-900/60 dark:to-zinc-900/30">
                        <tr>
                          <th className="h-12 min-w-[160px] pl-6 text-left align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Producto
                          </th>
                          <th className="h-12 w-[104px] text-right align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Costo u.
                          </th>
                          <th className="h-12 w-[112px] text-right align-middle text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            P. unit.
                          </th>
                          <th className="h-12 w-[80px] text-right align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Cant.
                          </th>
                          <th className="h-12 w-[120px] text-right align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Subtotal
                          </th>
                          <th className="h-12 w-[48px] pr-6" />
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, idx) => {
                          const sub = quoteLineTotal(l.list_unit_price, l.quantity);
                          return (
                            <tr
                              key={l.key}
                              className={cn(
                                "border-b border-border/40 transition-colors hover:bg-muted/30 dark:border-zinc-800/60",
                                idx % 2 === 1 && "bg-muted/15 dark:bg-zinc-900/20",
                              )}
                            >
                              <td className="p-4 pl-6 align-middle">
                                <div className="font-bold text-sm leading-snug">{l.product_name}</div>
                                {l.presentation ? (
                                  <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">{l.presentation}</div>
                                ) : null}
                              </td>
                              <td className="p-4 align-middle text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  className={cn(inputClassName, "h-9 text-right w-[96px] ml-auto tabular-nums")}
                                  value={l.unit_cost}
                                  onChange={(e) =>
                                    updateLine(l.key, { unit_cost: Math.max(0, parseFloat(e.target.value) || 0) })
                                  }
                                />
                              </td>
                              <td className="p-4 align-middle text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  className={cn(
                                    inputClassName,
                                    "h-9 text-right w-[100px] ml-auto font-semibold tabular-nums border-emerald-500/20 dark:border-emerald-500/25",
                                  )}
                                  value={l.list_unit_price}
                                  onChange={(e) =>
                                    updateLine(l.key, {
                                      list_unit_price: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                />
                              </td>
                              <td className="p-4 align-middle text-right">
                                <Input
                                  type="number"
                                  min={0.0001}
                                  step="any"
                                  className={cn(inputClassName, "h-9 text-right w-[68px] ml-auto tabular-nums")}
                                  value={l.quantity}
                                  onChange={(e) =>
                                    updateLine(l.key, {
                                      quantity: Math.max(0.0001, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                />
                              </td>
                              <td className="p-4 align-middle text-right tabular-nums text-sm font-black text-primary">
                                {formatCop(sub)}
                              </td>
                              <td className="p-4 pr-6 align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-9 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeLine(l.key)}
                                  aria-label="Quitar línea"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-border bg-gradient-to-r from-primary/[0.06] via-muted/30 to-transparent px-5 py-5 sm:px-8 sm:items-end dark:from-primary/10 dark:via-zinc-900/50">
                    <div className="text-xl font-black sm:text-2xl w-full sm:text-right tracking-tight">
                      Total: <span className="tabular-nums text-primary">{formatCop(total)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:pl-0">
          <Card className="rounded-[1.25rem] border-border/60 shadow-lg overflow-hidden sticky top-20 dark:border-zinc-800">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-transparent pb-4 dark:from-zinc-900/50">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary shrink-0" aria-hidden />
                <CardTitle className="text-base font-bold">Recientes</CardTitle>
              </div>
              <CardDescription className="text-xs leading-relaxed">Abrir para editar o descargar PDF.</CardDescription>
            </CardHeader>
            <CardContent className="p-3 max-h-[min(70vh,520px)] overflow-y-auto space-y-2">
              {recentQuotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/25 px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">Guarde una cotización para verla aquí.</p>
                </div>
              ) : (
                recentQuotes.map((q) => {
                  const loading = loadingQuoteId === q.id;
                  return (
                    <div
                      key={q.id}
                      className="group rounded-xl border border-border/60 bg-card p-3.5 transition-all hover:border-primary/30 hover:shadow-md dark:border-zinc-800 dark:hover:border-blue-500/25"
                    >
                      <div className="font-bold text-sm leading-snug line-clamp-2">{q.customer_name || "Sin nombre"}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {new Date(q.created_at).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex gap-1.5 mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="flex-1 rounded-xl h-9 text-xs font-bold gap-1.5"
                          onClick={() => handleLoadQuote(q.id)}
                          disabled={loading || deletingQuote}
                        >
                          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FolderOpen className="size-3.5" />}
                          Abrir
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0 rounded-xl" asChild>
                          <Link href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer" title="Descargar PDF">
                            <FileDown className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9 shrink-0 rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/40"
                          title="Eliminar cotización"
                          disabled={deletingQuote}
                          onClick={() =>
                            setPendingDelete({
                              id: q.id,
                              label: q.customer_name.trim() || "Sin nombre",
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deletingQuote) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará permanentemente la cotización de <strong>{pendingDelete?.label}</strong> y todas sus líneas. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingQuote}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingQuote}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteQuote();
              }}
            >
              {deletingQuote ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
