"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  Package,
  Trash2,
  Minus,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
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
import { usesLargeUnitInventory } from "@/lib/inventory-units";
import { validateMovementLine } from "@/lib/inventory-movement-validation";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export interface MovementFormLineProps {
  index: number;
  lineKey: string;
  dialogOpen: boolean;
  canRemove: boolean;
  onRemove: () => void;
  linePreview: { balanceBefore: number; balanceAfter: number; violates: boolean };
  onRegisterProductStock: (productId: string, stock: number | null) => void;
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
  const unitCost = form.watch(`lines.${index}.historical_unit_cost`) as number | undefined;

  const compact = showCollapseChrome && isCollapsed;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductSearchHit | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [stockLoading, setStockLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const usesLargePackaging = usesLargeUnitInventory(selectedProduct?.packaging);
  const entryUnitLabel = getInventoryUnitLabel(selectedProduct?.packaging);
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
  }, [selectedProduct?.id, selectedProduct?.packaging, productId, index, setValue]);

  async function handleSelectProduct(p: ProductSearchHit) {
    setSelectedProduct(p);
    setValue(`lines.${index}.product_id`, p.id, { shouldValidate: true });
    setValue(`lines.${index}.historical_unit_cost`, p.cost, { shouldValidate: true });
    setSearchResults([]);
    setSearchQuery("");
    setStockLoading(true);
    try {
      const fresh = await getProductStockQuantity(p.id);
      onRegisterProductStock(p.id, fresh ?? 0);
    } finally {
      setStockLoading(false);
    }
  }

  function handleClearProduct() {
    setSelectedProduct(null);
    setValue(`lines.${index}.product_id`, "", { shouldValidate: true });
    setValue(`lines.${index}.historical_unit_cost`, 0, { shouldValidate: true });
    setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
  }

  function handleMovementTypeChange(
    type: MovementType,
    onChange: (value: MovementType) => void,
  ) {
    if (type === "out" && selectedProduct && !usesLargePackaging) {
      toast.error(
        "Las salidas se registran solo en caja/paca. Este producto no tiene empaque grande configurado.",
      );
      return;
    }
    onChange(type);
    setValue(`lines.${index}.movement_type`, type, { shouldValidate: true });
  }

  const stockDisplay = getStockDisplayInfo(
    selectedProduct ? linePreview.balanceBefore : null,
    selectedProduct?.packaging,
  );

  const quantityBase = parseLineQuantity(lineQuantity);

  const balanceBefore = linePreview.balanceBefore;
  const balanceAfter = linePreview.balanceAfter;
  const violatesStock = linePreview.violates;

  const maxOut =
    movementType === "out" ? Math.max(0, balanceBefore) : Number.POSITIVE_INFINITY;

  const lineValidation =
    selectedProduct && productId
      ? validateMovementLine(
          movementType,
          quantityBase,
          balanceBefore,
          selectedProduct.packaging,
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
      ? formatMovementQuantityLabel(quantityBase, selectedProduct.packaging)
      : null;

  const afterLabel = selectedProduct
    ? formatMovementQuantityLabel(balanceAfter, selectedProduct.packaging)
    : null;

  const showPreview = Boolean(selectedProduct && productId && quantityBase > 0);

  const previewTone =
    movementType === "in"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : movementType === "out"
        ? violatesStock
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-muted/40"
      : "border-amber-500/30 bg-amber-500/5";

  const compactQuantityLabel = selectedProduct
    ? formatMovementQuantityLabel(parseLineQuantity(lineQuantity), selectedProduct.packaging)
    : "—";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/50 transition-shadow",
        compact ? "p-2" : "p-3 space-y-3",
        violatesStock || lineValidation?.severity === "error"
          ? "border-destructive/50"
          : "border-border",
      )}
      onFocusCapture={!compact && showCollapseChrome ? () => onActivateLine() : undefined}
    >
      {compact ? (
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/80 bg-background px-2.5 py-2 text-left hover:bg-muted/50"
            onClick={onActivateLine}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selectedProduct?.name ?? "Producto"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {MOVEMENT_TYPE_LABELS[movementType]} · {compactQuantityLabel}
                {showPreview && afterLabel ? ` → ${afterLabel}` : ""}
              </p>
            </div>
            <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground" />
          </button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={cn("space-y-3", compact && "hidden")} aria-hidden={compact}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Línea {index + 1}
          </span>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>

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
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2 min-h-10">
                  <Package className="size-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {selectedProduct.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {productMetaLabel(selectedProduct) || "Sin empaque configurado"}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs font-medium text-primary sm:inline">
                    {stockLoading ? "Actualizando stock…" : stockDisplay.primary}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-xs"
                    onClick={handleClearProduct}
                  >
                    Cambiar
                  </Button>
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
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-background">
                      {searching ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">Buscando…</p>
                      ) : searchResults.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">Sin resultados</p>
                      ) : (
                        <ul>
                          {searchResults.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="w-full px-2.5 py-2 text-left hover:bg-muted/50 border-b border-border/50 last:border-0"
                                onClick={() => handleSelectProduct(p)}
                              >
                                <p className="text-sm font-medium leading-snug">{p.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {productMetaLabel(p)}
                                  {p.stock_quantity != null
                                    ? ` · ${getStockDisplayInfo(p.stock_quantity, p.packaging).primary}`
                                    : ""}
                                </p>
                              </button>
                            </li>
                          ))}
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
                    <FormLabel className="text-xs text-muted-foreground">Movimiento</FormLabel>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MOVEMENT_TYPES.map((type) => {
                        const active = movementType === type;
                        const Icon =
                          type === "in"
                            ? ArrowDownLeft
                            : type === "out"
                              ? ArrowUpRight
                              : RefreshCw;
                        const outDisabled = type === "out" && !usesLargePackaging;
                        return (
                          <Button
                            key={type + comboboxKey}
                            type="button"
                            variant={active ? "default" : "outline"}
                            size="sm"
                            disabled={outDisabled}
                            title={
                              outDisabled
                                ? "Salida solo en caja/paca (configurá empaque en el producto)"
                                : undefined
                            }
                            className={cn(
                              "h-9 gap-1 rounded-lg px-2 text-xs font-semibold",
                              active && type === "in" && "bg-emerald-600 hover:bg-emerald-600/90",
                              active && type === "out" && "bg-red-600 hover:bg-red-600/90",
                              active && type === "adjustment" && "bg-amber-600 hover:bg-amber-600/90",
                            )}
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
                    <FormLabel className="text-xs text-muted-foreground">
                      Cantidad
                      <span className="font-normal"> ({entryUnitLabel})</span>
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

            {showPreview && !stockLoading ? (
              <div
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1",
                  previewTone,
                )}
                role="status"
                aria-live="polite"
              >
                <span className="text-xs text-muted-foreground sm:sr-only">Vista previa</span>
                <span className="font-medium tabular-nums">{stockDisplay.primary}</span>
                <ArrowRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    movementType === "in" && "text-emerald-700 dark:text-emerald-400",
                    movementType === "out" &&
                      (violatesStock
                        ? "text-destructive"
                        : "text-foreground"),
                    movementType === "adjustment" && "text-amber-800 dark:text-amber-400",
                  )}
                >
                  {movementType === "in" && qtyLabel ? `+${qtyLabel}` : null}
                  {movementType === "out" && qtyLabel ? `−${qtyLabel}` : null}
                  {movementType === "adjustment" && qtyLabel ? `→ ${qtyLabel}` : null}
                </span>
                <ArrowRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
                <span className="text-xs text-muted-foreground sm:mr-1">Quedan</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    violatesStock ? "text-destructive" : "text-foreground",
                  )}
                >
                  {afterLabel}
                </span>
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

            <p className="text-[11px] text-muted-foreground text-right">
              Costo ref. {formatCop(Number(unitCost ?? 0))}
              {packagingLabel ? (
                <span className="ml-2">· Empaque: {packagingLabel}</span>
              ) : null}
              {usesLargePackaging && movementType === "out" ? (
                <span className="ml-2">· Movimiento en {entryUnitLabel}</span>
              ) : null}
              {usesLargePackaging ? (
                <span className="ml-2 block sm:inline">
                  · 1 {entryUnitLabel} = 1 unidad de stock (el ×70 no se usa en el cálculo)
                </span>
              ) : null}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
