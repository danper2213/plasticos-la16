"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  Trash2,
  Minus,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MOVEMENT_TYPES,
  type BatchInventoryMovementFormValues,
  type MovementType,
} from "@/app/dashboard/inventory/schema";
import { searchProductsForMovement, getProductStockQuantity } from "@/app/dashboard/inventory/actions";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";
import {
  formatMovementQuantityLabel,
  formatPackagingDescriptor,
  getInventoryUnitLabel,
  getStockDisplayInfo,
} from "@/lib/inventory-stock-display";
import { parseLineQuantity } from "@/lib/inventory-movement-preview";
import { normalizeInventoryQuantity } from "@/lib/inventory-quantity";
import {
  defaultQuantityUnit,
  formatQuantityInUnit,
  getPackagingFactor,
  maxOutInQuantityUnit,
  quantityToStockUnits,
  resolveExitUnitOptions,
  type QuantityUnit,
} from "@/lib/inventory-quantity-unit";
import { validateMovementLine } from "@/lib/inventory-movement-validation";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

function readLineQuantity(value: unknown): number {
  const n = parseLineQuantity(value);
  return n > 0 ? n : 1;
}

function commitLineQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return normalizeInventoryQuantity(value);
}

function productMetaLabel(p: ProductSearchHit): string {
  return [p.supplier_name, formatPackagingDescriptor(p.packaging)].filter(Boolean).join(" · ");
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const needle = query.trim();
  if (needle.length < 2) return text;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

export interface MovementFormLineProps {
  index: number;
  lineKey: string;
  dialogOpen: boolean;
  canRemove: boolean;
  onRemove: () => void;
  linePreview: { balanceBefore: number; balanceAfter: number; violates: boolean };
  onRegisterProductStock: (
    productId: string,
    stock: number | null,
    meta?: { packaging?: string | null; presentation?: string | null },
  ) => void;
  showCollapseChrome: boolean;
  isCollapsed: boolean;
  onActivateLine: () => void;
}

export function MovementFormLine({
  index,
  lineKey,
  dialogOpen,
  canRemove,
  onRemove,
  linePreview,
  onRegisterProductStock,
  showCollapseChrome,
  isCollapsed,
  onActivateLine,
}: MovementFormLineProps) {
  const form = useFormContext<BatchInventoryMovementFormValues>();
  const { setValue, getValues } = form;
  const productId = form.watch(`lines.${index}.product_id`);
  const movementType = form.watch(`lines.${index}.movement_type`) as MovementType;
  const lineQuantity = form.watch(`lines.${index}.quantity`) as number | undefined;
  const quantityUnit = (form.watch(`lines.${index}.quantity_unit`) ??
    "pack") as QuantityUnit;
  const unitCost = form.watch(`lines.${index}.historical_unit_cost`) as number | undefined;

  const compact = showCollapseChrome && isCollapsed;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductSearchHit | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [stockLoading, setStockLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const usesQuantityUnitSelector =
    movementType === "in" || movementType === "out";
  const quantityUnitOptions = resolveExitUnitOptions(
    selectedProduct?.packaging,
    selectedProduct?.presentation,
  );
  const packagingFactor = getPackagingFactor(selectedProduct?.packaging);
  const entryUnitLabel =
    usesQuantityUnitSelector && quantityUnit === "unit"
      ? quantityUnitOptions.find((o) => o.value === "unit")?.label ?? "unidad"
      : getInventoryUnitLabel(selectedProduct?.packaging);
  const packagingLabel = formatPackagingDescriptor(selectedProduct?.packaging);

  React.useEffect(() => {
    if (!productId) {
      setSelectedProduct(null);
    }
  }, [productId]);

  React.useEffect(() => {
    if (!dialogOpen || selectedProduct || compact) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [dialogOpen, selectedProduct, compact, index]);

  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      searchProductsForMovement(q).then((results) => {
        setSearchResults(results);
        setSearching(false);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  React.useEffect(() => {
    if (!selectedProduct?.id) {
      if (!productId) {
        setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
      }
      return;
    }

    setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
    setValue(
      `lines.${index}.quantity_unit`,
      defaultQuantityUnit(selectedProduct?.packaging),
      { shouldValidate: true },
    );
  }, [selectedProduct?.id, selectedProduct?.packaging, productId, index, setValue]);

  async function handleSelectProduct(p: ProductSearchHit) {
    setSelectedProduct(p);
    setValue(`lines.${index}.product_id`, p.id, { shouldValidate: true });
    setValue(`lines.${index}.historical_unit_cost`, p.cost, { shouldValidate: true });
    setValue(
      `lines.${index}.quantity_unit`,
      defaultQuantityUnit(p.packaging),
      { shouldValidate: true },
    );
    setSearchResults([]);
    setSearchQuery("");
    setStockLoading(true);
    try {
      const fresh = await getProductStockQuantity(p.id);
      onRegisterProductStock(p.id, fresh ?? 0, {
        packaging: p.packaging,
        presentation: p.presentation,
      });
    } finally {
      setStockLoading(false);
    }
  }

  function handleClearProduct() {
    setSelectedProduct(null);
    setValue(`lines.${index}.product_id`, "", { shouldValidate: true });
    setValue(`lines.${index}.historical_unit_cost`, 0, { shouldValidate: true });
    setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
    setValue(`lines.${index}.quantity_unit`, "pack", { shouldValidate: true });
  }

  function handleMovementTypeChange(
    type: MovementType,
    onChange: (value: MovementType) => void,
  ) {
    onChange(type);
    setValue(`lines.${index}.movement_type`, type, { shouldValidate: true });
    const nextUnit =
      type === "adjustment"
        ? "pack"
        : defaultQuantityUnit(selectedProduct?.packaging);
    setValue(`lines.${index}.quantity_unit`, nextUnit, { shouldValidate: true });
    if (quantityUnit !== nextUnit) {
      setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
    }
  }

  function handleQuantityUnitChange(unit: QuantityUnit) {
    setValue(`lines.${index}.quantity_unit`, unit, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`lines.${index}.quantity`, 1, { shouldValidate: true, shouldDirty: true });
  }

  const stockDisplay = getStockDisplayInfo(
    selectedProduct ? linePreview.balanceBefore : null,
    selectedProduct?.packaging,
    selectedProduct?.presentation,
  );

  const quantityBase = parseLineQuantity(lineQuantity);
  const quantityInStockUnits = quantityToStockUnits(
    quantityBase,
    usesQuantityUnitSelector ? quantityUnit : "pack",
    selectedProduct?.packaging,
  );

  const balanceBefore = linePreview.balanceBefore;
  const balanceAfter = linePreview.balanceAfter;
  const violatesStock = linePreview.violates;

  const maxOut =
    movementType === "out"
      ? maxOutInQuantityUnit(
          balanceBefore,
          quantityUnit,
          selectedProduct?.packaging,
        )
      : Number.POSITIVE_INFINITY;

  const lineValidation =
    selectedProduct && productId
      ? validateMovementLine(
          movementType,
          quantityInStockUnits,
          balanceBefore,
          selectedProduct.packaging,
          selectedProduct.presentation,
        )
      : null;

  const atMaxOut =
    movementType === "out" &&
    Number.isFinite(maxOut) &&
    quantityBase >= maxOut - 1e-9;

  const comboboxKey = `${lineKey}-${dialogOpen ? "open" : "closed"}`;

  function adjustQuantityStep(delta: number) {
    const current = readLineQuantity(getValues(`lines.${index}.quantity`));
    let next = Math.max(0, current + delta);
    if (movementType === "out" && delta > 0 && Number.isFinite(maxOut)) {
      next = Math.min(next, maxOut);
    }
    setValue(`lines.${index}.quantity`, commitLineQuantity(next), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  const qtyLabel =
    selectedProduct && quantityBase > 0
      ? usesQuantityUnitSelector
        ? formatQuantityInUnit(
            quantityBase,
            quantityUnit,
            selectedProduct.packaging,
            selectedProduct.presentation,
          )
        : formatMovementQuantityLabel(
            quantityBase,
            selectedProduct.packaging,
            selectedProduct.presentation,
          )
      : null;

  const afterLabel = selectedProduct
    ? formatMovementQuantityLabel(
        balanceAfter,
        selectedProduct.packaging,
        selectedProduct.presentation,
      )
    : null;

  const showPreview = Boolean(selectedProduct && productId && quantityBase > 0);

  const previewTone =
    movementType === "in"
      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
      : movementType === "out"
        ? violatesStock
          ? "border-destructive/40 bg-destructive/10"
          : "border-rose-500/20 bg-rose-500/[0.06]"
        : "border-amber-500/25 bg-amber-500/[0.06]";

  const movementDeltaClass =
    movementType === "in"
      ? "text-emerald-700 dark:text-emerald-300"
      : movementType === "out"
        ? violatesStock
          ? "text-destructive"
          : "text-rose-700 dark:text-rose-300"
        : "text-amber-800 dark:text-amber-300";

  const typeBadgeClass =
    movementType === "in"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : movementType === "out"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
        : "bg-amber-500/15 text-amber-800 dark:text-amber-300";

  const compactQuantityLabel = selectedProduct
    ? usesQuantityUnitSelector
      ? formatQuantityInUnit(
          parseLineQuantity(lineQuantity),
          quantityUnit,
          selectedProduct.packaging,
          selectedProduct.presentation,
        )
      : formatMovementQuantityLabel(
          parseLineQuantity(lineQuantity),
          selectedProduct.packaging,
          selectedProduct.presentation,
        )
    : "—";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 transition-shadow",
        compact ? "px-2 py-1.5" : "p-4 space-y-4",
        violatesStock || lineValidation?.severity === "error"
          ? "border-destructive/50"
          : "border-border",
      )}
      onFocusCapture={!compact && showCollapseChrome ? () => onActivateLine() : undefined}
    >
      {compact ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/50"
            onClick={onActivateLine}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selectedProduct?.name ?? "Producto"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {compactQuantityLabel}
                {showPreview && afterLabel ? ` · queda ${afterLabel}` : ""}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", typeBadgeClass)}>
              {MOVEMENT_TYPE_LABELS[movementType]}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={`Quitar línea ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={cn("space-y-3", compact && "hidden")} aria-hidden={compact}>
        {canRemove && !selectedProduct ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
              Quitar línea
            </Button>
          </div>
        ) : null}

        <FormField
          control={form.control}
          name={`lines.${index}.product_id`}
          render={({ field, fieldState }) => (
            <FormItem className="space-y-1.5">
              <FormControl>
                <input
                  type="hidden"
                  ref={field.ref}
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                />
              </FormControl>
              {selectedProduct ? (
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">
                      {selectedProduct.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {productMetaLabel(selectedProduct) || "Sin empaque configurado"}
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-primary hover:underline"
                      onClick={handleClearProduct}
                    >
                      Cambiar producto
                    </button>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        En bodega
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {stockLoading ? "…" : stockDisplay.primary}
                      </p>
                    </div>
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={onRemove}
                        aria-label={`Quitar ${selectedProduct.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative w-full">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Escribí el nombre del producto…"
                      autoComplete="off"
                      className="h-11 w-full rounded-xl border-border bg-background pl-10 text-center text-base placeholder:text-center placeholder:text-muted-foreground/70"
                      aria-label="Buscar producto"
                    />
                  </div>
                  {searchQuery.trim().length >= 2 ? (
                    <div className="max-h-64 overflow-y-auto rounded-2xl border border-border bg-card/80">
                      {searching ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">Buscando…</p>
                      ) : searchResults.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Ningún producto coincide con “{searchQuery.trim()}”.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border/70">
                          {searchResults.map((p) => {
                            const stockLabel =
                              p.stock_quantity == null
                                ? "Sin saldo"
                                : getStockDisplayInfo(
                                    p.stock_quantity,
                                    p.packaging,
                                    p.presentation,
                                  ).primary;
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                                  onClick={() => handleSelectProduct(p)}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold leading-tight">
                                      {highlightMatch(p.name, searchQuery)}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {productMetaLabel(p) || "Sin empaque configurado"}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      En bodega
                                    </p>
                                    <p className="text-sm font-semibold tabular-nums">{stockLabel}</p>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
              <FormMessage className="text-xs">{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />

        {selectedProduct ? (
          <>
            <input
              type="hidden"
              {...form.register(`lines.${index}.historical_unit_cost`, { valueAsNumber: true })}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
              <FormField
                control={form.control}
                name={`lines.${index}.movement_type`}
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <FormControl>
                      <input
                        type="hidden"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={typeof field.value === "string" ? field.value : "in"}
                        onChange={(e) => field.onChange(e.target.value as MovementType)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-medium text-muted-foreground">Tipo</FormLabel>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
                      {MOVEMENT_TYPES.map((type) => {
                        const active = movementType === type;
                        const Icon =
                          type === "in"
                            ? ArrowDownLeft
                            : type === "out"
                              ? ArrowUpRight
                              : RefreshCw;
                        return (
                          <Button
                            key={type + comboboxKey}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-9 gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-background/70 hover:text-foreground",
                              active &&
                                type === "in" &&
                                "bg-emerald-500/15 text-emerald-700 shadow-sm hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-300",
                              active &&
                                type === "out" &&
                                "bg-rose-500/15 text-rose-700 shadow-sm hover:bg-rose-500/20 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-300",
                              active &&
                                type === "adjustment" &&
                                "bg-amber-500/15 text-amber-800 shadow-sm hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-300",
                            )}
                            aria-pressed={active}
                            onClick={() => handleMovementTypeChange(type, field.onChange)}
                          >
                            <Icon className="size-3.5 shrink-0" />
                            {MOVEMENT_TYPE_LABELS[type]}
                          </Button>
                        );
                      })}
                    </div>
                    <FormMessage className="text-xs">{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`lines.${index}.quantity`}
                render={({ field, fieldState }) => {
                  const qty = readLineQuantity(field.value);
                  const showEmpty = typeof field.value === "number" && field.value === 0;
                  return (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Cantidad
                      <span className="font-normal"> · {entryUnitLabel}</span>
                    </FormLabel>
                    <div className="flex h-9 items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0 rounded-lg"
                        onClick={() => adjustQuantityStep(-1)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          ref={field.ref}
                          className={cn(
                            "h-9 flex-1 min-w-0 rounded-lg text-center text-base font-semibold tabular-nums",
                            lineValidation?.severity === "error" && "border-destructive",
                          )}
                          value={showEmpty ? "" : String(qty)}
                          onChange={(e) => {
                            const v = e.target.value.trim().replace(",", ".");
                            if (v === "" || v === "-" || v === ".") {
                              field.onChange(0);
                              return;
                            }
                            const n = Number(v);
                            field.onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
                          }}
                          onBlur={() => {
                            field.onBlur();
                            field.onChange(commitLineQuantity(readLineQuantity(field.value)));
                          }}
                          aria-invalid={lineValidation?.severity === "error" || fieldState.invalid}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0 rounded-lg"
                        onClick={() => adjustQuantityStep(1)}
                        disabled={atMaxOut}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <FormMessage className="text-xs">{fieldState.error?.message}</FormMessage>
                  </FormItem>
                  );
                }}
              />
            </div>

            {usesQuantityUnitSelector && quantityUnitOptions.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {movementType === "in" ? "Cómo entra" : "Cómo sale"}
                </p>
                <div
                  className={cn(
                    "grid gap-2",
                    quantityUnitOptions.length > 1 ? "grid-cols-2" : "grid-cols-1",
                  )}
                  role="radiogroup"
                  aria-label={movementType === "in" ? "Presentación de entrada" : "Presentación de salida"}
                >
                  {quantityUnitOptions.map((opt) => {
                    const active = quantityUnit === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={cn(
                          "flex min-h-11 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors",
                          active
                            ? "border-foreground/30 bg-background shadow-sm"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                        onClick={() => handleQuantityUnitChange(opt.value)}
                      >
                        <span className="text-sm font-semibold leading-tight text-foreground">
                          {opt.label}
                        </span>
                        {opt.hint ? (
                          <span className="text-[11px] font-normal leading-tight text-muted-foreground">
                            {opt.hint}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showPreview && !stockLoading ? (
              <div
                className={cn("grid grid-cols-3 divide-x divide-border/70 overflow-hidden rounded-xl border", previewTone)}
                role="status"
                aria-live="polite"
              >
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Antes
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{stockDisplay.primary}</p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Movimiento
                  </p>
                  <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", movementDeltaClass)}>
                    {movementType === "in" && qtyLabel ? `+ ${qtyLabel}` : null}
                    {movementType === "out" && qtyLabel ? `− ${qtyLabel}` : null}
                    {movementType === "adjustment" && qtyLabel ? qtyLabel : null}
                  </p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quedará
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-sm font-bold tabular-nums",
                      violatesStock ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {afterLabel}
                  </p>
                </div>
              </div>
            ) : null}

            {lineValidation?.severity === "error" || lineValidation?.severity === "warning" ? (
              <p
                className={cn(
                  "flex items-start gap-1.5 text-xs leading-snug",
                  lineValidation.severity === "error" ? "text-destructive" : "text-amber-800 dark:text-amber-300",
                )}
              >
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                {lineValidation.reason}
              </p>
            ) : null}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Costo ref. {formatCop(Number(unitCost ?? 0))}
              {packagingLabel ? <span> · {packagingLabel}</span> : null}
              {usesQuantityUnitSelector &&
              packagingFactor != null &&
              packagingFactor > 1 &&
              quantityUnit === "unit" ? (
                <span>
                  {" "}
                  · {packagingFactor} {entryUnitLabel} = 1{" "}
                  {getInventoryUnitLabel(selectedProduct?.packaging)}
                </span>
              ) : usesQuantityUnitSelector && quantityUnit === "pack" ? (
                <span> · 1 {entryUnitLabel} = 1 en stock</span>
              ) : null}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
