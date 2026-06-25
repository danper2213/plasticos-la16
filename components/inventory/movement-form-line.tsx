"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  ArrowLeftRight,
  Package,
  Hash,
  CircleDollarSign,
  Trash2,
  Minus,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Warehouse,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
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
import { DashboardSearchBar } from "@/components/layout/dashboard-search-bar";
import {
  MOVEMENT_TYPES,
  type BatchInventoryMovementFormValues,
  type MovementType,
} from "@/app/dashboard/inventory/schema";
import { searchProductsForMovement } from "@/app/dashboard/inventory/actions";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";
import { parsePackagingConversion } from "@/lib/parse-packaging";
import {
  formatInventoryQuantity,
  normalizeInventoryQuantity,
} from "@/lib/inventory-quantity";
import {
  formatMovementQuantityLabel,
  getStockDisplayInfo,
} from "@/lib/inventory-stock-display";
import { validateMovementLine } from "@/lib/inventory-movement-validation";
import { formatCop } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

interface DerivedUnit {
  id: string;
  name: string;
  factor_to_base: number;
}

export interface MovementFormLineProps {
  index: number;
  lineKey: string;
  dialogOpen: boolean;
  canRemove: boolean;
  onRemove: () => void;
  /** Saldo simulado antes/después de esta línea (mismo producto en varias líneas acumula). */
  linePreview: { balanceBefore: number; balanceAfter: number; violates: boolean };
  onRegisterProductStock: (productId: string, stock: number | null) => void;
  /** Varias líneas: mostrar resumen comprimido cuando no es la activa. */
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
  const movementType = form.watch(`lines.${index}.movement_type`);
  const lineQuantity = form.watch(`lines.${index}.quantity`) as number | undefined;

  const compact = showCollapseChrome && isCollapsed;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductSearchHit | null>(null);
  const [searching, setSearching] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [units, setUnits] = React.useState<DerivedUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = React.useState<DerivedUnit | null>(null);
  const [quantityEntered, setQuantityEntered] = React.useState<number>(1);
  const [parsedBaseLabel, setParsedBaseLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!productId) {
      setSelectedProduct(null);
      setUnits([]);
      setSelectedUnit(null);
      setQuantityEntered(1);
      setParsedBaseLabel(null);
    }
  }, [productId]);

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
      setUnits([]);
      setSelectedUnit(null);
      setQuantityEntered(1);
      setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
      setParsedBaseLabel(null);
      return;
    }

    const parsed = parsePackagingConversion(selectedProduct.packaging);
    if (parsed) {
      const baseName = selectedProduct.presentation?.trim() || "Unidad";
      const fromPackaging: DerivedUnit[] = [
        { id: "base", name: baseName, factor_to_base: 1 },
        { id: "pack", name: parsed.unitName, factor_to_base: parsed.factor },
      ];
      setUnits(fromPackaging);
      setSelectedUnit(fromPackaging[1]);
      setQuantityEntered(1);
      setValue(`lines.${index}.quantity`, normalizeInventoryQuantity(1 * parsed.factor), {
        shouldValidate: true,
      });
      setParsedBaseLabel(parsed.baseLabel ?? null);
      return;
    }

    setUnits([]);
    setSelectedUnit(null);
    setQuantityEntered(1);
    setValue(`lines.${index}.quantity`, 1, { shouldValidate: true });
    setParsedBaseLabel(null);
  }, [selectedProduct?.id, selectedProduct?.packaging, selectedProduct?.presentation, index, setValue]);

  /** Sincroniza cantidad en unidad base al formulario. */
  React.useEffect(() => {
    if (!selectedProduct?.id) return;
    const packUnit = units.find((u) => u.factor_to_base > 1);
    const factor = packUnit?.factor_to_base ?? selectedUnit?.factor_to_base ?? 1;
    const q = Number.isFinite(quantityEntered) && quantityEntered > 0 ? quantityEntered : 0;
    const finalQty = q <= 0 ? 0 : normalizeInventoryQuantity(q * factor);
    const path = `lines.${index}.quantity` as const;
    const curr = getValues(path);
    if (curr === finalQty) return;
    setValue(path, finalQty, { shouldValidate: true });
  }, [quantityEntered, selectedUnit, units, selectedProduct?.id, index, getValues, setValue]);

  function handleSelectProduct(p: ProductSearchHit) {
    setSelectedProduct(p);
    setValue(`lines.${index}.product_id`, p.id, { shouldValidate: true });
    setValue(`lines.${index}.historical_unit_cost`, p.cost, { shouldValidate: true });
    onRegisterProductStock(p.id, p.stock_quantity ?? null);
    setSearchResults([]);
    setSearchQuery("");
  }

  function handleClearProduct() {
    setSelectedProduct(null);
    setValue(`lines.${index}.product_id`, "", { shouldValidate: true });
    setValue(`lines.${index}.historical_unit_cost`, 0, { shouldValidate: true });
    setUnits([]);
    setSelectedUnit(null);
    setQuantityEntered(1);
  }

  const baseUnitName =
    parsedBaseLabel ?? units.find((u) => u.factor_to_base === 1)?.name ?? "unidades";
  const largeUnit = units.find((u) => u.factor_to_base > 1) ?? null;
  const entryUnit = largeUnit ?? selectedUnit;
  const usesLargePackaging = Boolean(largeUnit);

  const stockDisplay = getStockDisplayInfo(
    selectedProduct ? linePreview.balanceBefore : null,
    selectedProduct?.packaging,
    selectedProduct?.presentation,
  );

  const balanceAfterLabel = selectedProduct
    ? formatMovementQuantityLabel(
        linePreview.balanceAfter,
        selectedProduct.packaging,
        selectedProduct.presentation,
      )
    : null;

  const maxOutBase =
    movementType === "out" ? Math.max(0, linePreview.balanceBefore) : Number.POSITIVE_INFINITY;

  const maxOutLabel =
    movementType === "out" && selectedProduct && Number.isFinite(maxOutBase)
      ? formatMovementQuantityLabel(
          maxOutBase,
          selectedProduct.packaging,
          selectedProduct.presentation,
        )
      : null;

  const quantityBase =
    typeof lineQuantity === "number" && Number.isFinite(lineQuantity) ? lineQuantity : 0;

  const lineValidation =
    selectedProduct && productId
      ? validateMovementLine(
          movementType,
          quantityBase,
          linePreview.balanceBefore,
          selectedProduct.packaging,
          selectedProduct.presentation,
        )
      : null;

  const entryFactor = entryUnit?.factor_to_base ?? 1;
  const maxEnteredOut =
    movementType === "out" && Number.isFinite(maxOutBase)
      ? maxOutBase / Math.max(entryFactor, 1e-12)
      : Number.POSITIVE_INFINITY;
  const atMaxOut =
    movementType === "out" &&
    Number.isFinite(maxEnteredOut) &&
    quantityEntered >= maxEnteredOut - 1e-9;

  const comboboxKey = `${lineKey}-${dialogOpen ? "open" : "closed"}`;

  function adjustQuantityStep(deltaEntered: number) {
    const factor = entryUnit?.factor_to_base ?? 1;
    let nextEntered = Math.max(0, quantityEntered + deltaEntered);
    if (movementType === "out" && deltaEntered > 0 && Number.isFinite(maxOutBase)) {
      const maxEntered = maxOutBase / Math.max(factor, 1e-12);
      nextEntered = Math.min(nextEntered, maxEntered);
    }
    setQuantityEntered(nextEntered);
  }

  const compactQuantityLabel = selectedProduct
    ? formatMovementQuantityLabel(
        typeof lineQuantity === "number" ? lineQuantity : 0,
        selectedProduct.packaging,
        selectedProduct.presentation,
      )
    : "—";

  return (
    <div
      className={cn(
        "rounded-xl border bg-muted/20 transition-shadow",
        compact ? "p-2" : "p-4 space-y-4",
        linePreview.violates || lineValidation?.severity === "error"
          ? "border-destructive/60 ring-2 ring-destructive/20"
          : lineValidation?.severity === "ok" && movementType === "out"
            ? "border-emerald-500/35 ring-1 ring-emerald-500/20"
            : "border-border"
      )}
      onFocusCapture={
        !compact && showCollapseChrome ? () => onActivateLine() : undefined
      }
    >
      {compact ? (
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
              linePreview.violates && "border-destructive/50 bg-destructive/5"
            )}
            onClick={onActivateLine}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {selectedProduct?.name ?? "Seleccioná un producto"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {MOVEMENT_TYPE_LABELS[movementType as MovementType] ?? movementType} ·{" "}
                {compactQuantityLabel}
                {linePreview.violates ? " · saldo negativo" : ""}
              </p>
            </div>
            {linePreview.violates ? (
              <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
            ) : null}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground rotate-[-90deg]" aria-hidden />
          </button>
          {canRemove ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-auto min-h-[44px] w-10 shrink-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Quitar línea"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn("space-y-4", compact && "hidden")}
        aria-hidden={compact}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Producto {index + 1}</p>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
              title="Quitar línea"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>

      <FormField
        control={form.control}
        name={`lines.${index}.product_id`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormControl>
              <input
                type="hidden"
                ref={field.ref}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormLabel className="text-muted-foreground flex items-center gap-2">
              <Package className="size-4 text-primary shrink-0" aria-hidden />
              Producto
            </FormLabel>
            {selectedProduct ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg h-10 border border-border bg-muted/30 px-3">
                  <span className="flex-1 truncate text-sm font-medium">
                    {selectedProduct.name}
                    {selectedProduct.presentation ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({selectedProduct.presentation})
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 text-muted-foreground hover:text-foreground"
                    onClick={handleClearProduct}
                  >
                    Cambiar
                  </Button>
                </div>

                <div
                  className={cn(
                    "rounded-xl border-2 px-4 py-3",
                    linePreview.violates
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-primary/30 bg-gradient-to-br from-primary/[0.12] to-primary/[0.04]",
                  )}
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Warehouse className="size-3.5 shrink-0 text-primary" aria-hidden />
                    Stock en bodega
                  </div>
                  <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-foreground sm:text-3xl">
                    {stockDisplay.primary}
                  </p>
                  {movementType === "out" && maxOutLabel ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Máximo para salida:{" "}
                      <span className="font-semibold text-foreground">{maxOutLabel}</span>
                    </p>
                  ) : null}
                  {selectedProduct.packaging && usesLargePackaging ? (
                    <p className="mt-1 text-[11px] text-muted-foreground/90">
                      Registrás movimientos en{" "}
                      <span className="font-medium text-foreground/90">
                        {largeUnit?.name ?? "presentación grande"}
                      </span>
                      {largeUnit && largeUnit.factor_to_base > 1
                        ? ` (1 = ${formatInventoryQuantity(largeUnit.factor_to_base)} ${baseUnitName})`
                        : null}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative max-w-md">
                  <DashboardSearchBar
                    variant="default"
                    align="start"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                    onSubmit={() => undefined}
                    placeholder="Buscar por nombre (mín. 2 caracteres)"
                    ariaLabel="Buscar producto"
                  />
                </div>
                {searchQuery.trim().length >= 2 && (
                  <div className="rounded-lg border border-border bg-background max-h-48 overflow-y-auto">
                    {searching ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        Buscando…
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No hay resultados. Pruebe otro término.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {searchResults.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex flex-col gap-0.5"
                              onClick={() => handleSelectProduct(p)}
                            >
                              <span className="font-medium">{p.name}</span>
                              {p.presentation ? (
                                <span className="text-muted-foreground text-xs">
                                  {p.presentation}
                                </span>
                              ) : null}
                              {p.stock_quantity !== null && p.stock_quantity !== undefined ? (
                                <span className="text-xs text-primary/90">
                                  Bodega:{" "}
                                  {
                                    getStockDisplayInfo(
                                      p.stock_quantity,
                                      p.packaging,
                                      p.presentation,
                                    ).primary
                                  }
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`lines.${index}.movement_type`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-primary shrink-0" aria-hidden />
              Tipo de movimiento
            </FormLabel>
            <FormControl>
              <div className="grid grid-cols-3 gap-2">
                {MOVEMENT_TYPES.map((type) => {
                  const active = field.value === type;
                  const Icon = type === "in" ? ArrowDownLeft : type === "out" ? ArrowUpRight : RefreshCw;
                  return (
                    <Button
                      key={type + comboboxKey}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className={cn(
                        "h-auto flex-col gap-1 py-3 rounded-xl border-2 transition-all",
                        active && type === "in" && "border-emerald-500/50 shadow-sm",
                        active && type === "out" && "border-red-500/50 shadow-sm",
                        active && type === "adjustment" && "border-amber-500/50 shadow-sm"
                      )}
                      onClick={() => field.onChange(type)}
                    >
                      <Icon className="size-5" aria-hidden />
                      <span className="text-xs font-semibold">{MOVEMENT_TYPE_LABELS[type]}</span>
                    </Button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`lines.${index}.quantity`}
        render={({ fieldState }) => (
          <FormItem>
            <FormLabel className="text-muted-foreground flex items-center gap-2">
              <Hash className="size-4 text-primary shrink-0" aria-hidden />
              Cantidad
              {entryUnit ? (
                <span className="font-normal text-muted-foreground">
                  (en {entryUnit.name})
                </span>
              ) : null}
            </FormLabel>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => adjustQuantityStep(-1)}
                  title="Restar 1"
                >
                  <Minus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => adjustQuantityStep(1)}
                  title="Sumar 1"
                  disabled={atMaxOut}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className={cn(
                    inputClassName,
                    "max-w-[10rem] text-lg font-semibold tabular-nums",
                    lineValidation?.severity === "error" &&
                      "border-destructive ring-2 ring-destructive/25",
                  )}
                  value={quantityEntered === 0 ? "" : String(quantityEntered)}
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(",", ".");
                    if (v === "" || v === "-" || v === "." || v === "-.") {
                      setQuantityEntered(0);
                      return;
                    }
                    const n = Number(v);
                    setQuantityEntered(Number.isFinite(n) ? Math.max(0, n) : 0);
                  }}
                  placeholder="0"
                  aria-invalid={lineValidation?.severity === "error" || fieldState.invalid}
                />
              </FormControl>
              {entryUnit && usesLargePackaging ? (
                <span className="text-sm font-medium text-muted-foreground">
                  {entryUnit.name}
                </span>
              ) : null}
            </div>
            {selectedProduct && productId && lineValidation ? (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm",
                  lineValidation.severity === "error" &&
                    "border-destructive/50 bg-destructive/10 text-destructive",
                  lineValidation.severity === "warning" &&
                    "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                  lineValidation.severity === "ok" &&
                    movementType === "out" &&
                    "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
                )}
                role="status"
                aria-live="polite"
              >
                <p className="flex items-start gap-2 font-medium">
                  {lineValidation.severity === "error" ? (
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
                  ) : lineValidation.severity === "ok" && movementType === "out" ? (
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" aria-hidden />
                  ) : null}
                  <span>{lineValidation.reason}</span>
                </p>
              </div>
            ) : null}
            {selectedProduct && productId ? (
              <div className="space-y-2 rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">Saldo tras esta línea</span>
                  <span
                    className={cn(
                      "tabular-nums font-bold text-base",
                      linePreview.violates ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {balanceAfterLabel}
                  </span>
                </div>
                {movementType === "out" && linePreview.balanceBefore > 0 && !linePreview.violates ? (
                  <Progress
                    value={Math.max(0, linePreview.balanceAfter)}
                    max={Math.max(linePreview.balanceBefore, 1)}
                    className="h-2 bg-muted"
                  />
                ) : null}
              </div>
            ) : null}
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />

      {selectedProduct ? (
        <FormField
          control={form.control}
          name={`lines.${index}.historical_unit_cost`}
          render={({ field }) => (
            <FormItem className="mb-0">
              <FormControl>
                <input
                  type="hidden"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  value={Number(field.value ?? 0)}
                />
              </FormControl>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CircleDollarSign className="size-4 shrink-0 text-primary/80" aria-hidden />
                  Costo unitario (referencia)
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCop(Number(field.value ?? 0))}
                </span>
              </div>
            </FormItem>
          )}
        />
      ) : null}
      </div>
    </div>
  );
}
