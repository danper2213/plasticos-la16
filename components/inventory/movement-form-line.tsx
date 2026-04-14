"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  ArrowLeftRight,
  Package,
  Hash,
  CircleDollarSign,
  Search,
  Trash2,
  Minus,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Warehouse,
  AlertTriangle,
  ChevronDown,
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
import { SearchCombobox } from "@/components/ui/search-combobox";
import {
  MOVEMENT_TYPES,
  type BatchInventoryMovementFormValues,
  type MovementType,
} from "@/app/dashboard/inventory/schema";
import { searchProductsForMovement } from "@/app/dashboard/inventory/actions";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";
import { parsePackagingConversion } from "@/lib/parse-packaging";
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
      setValue(`lines.${index}.quantity`, Math.round(1 * parsed.factor), {
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

  /** Sincroniza cantidad en unidad base al formulario (sin clamp de salida aquí: evita bucles setState). */
  React.useEffect(() => {
    if (!selectedProduct?.id) return;
    const factor = selectedUnit?.factor_to_base ?? 1;
    const q = Number.isFinite(quantityEntered) && quantityEntered > 0 ? quantityEntered : 0;
    const finalQty = Math.max(1, Math.round(q * factor));
    const path = `lines.${index}.quantity` as const;
    const curr = getValues(path);
    if (curr === finalQty) return;
    setValue(path, finalQty, { shouldValidate: false });
  }, [quantityEntered, selectedUnit, selectedProduct?.id, index, getValues, setValue]);

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
  const computedQuantity =
    (Number.isFinite(quantityEntered) ? quantityEntered : 0) *
    (selectedUnit?.factor_to_base ?? 1);
  const showEquivalent =
    selectedUnit &&
    selectedUnit.factor_to_base !== 1 &&
    quantityEntered > 0 &&
    computedQuantity > 0;

  const comboboxKey = `${lineKey}-${dialogOpen ? "open" : "closed"}`;

  const maxOutBase =
    movementType === "out" ? Math.max(0, linePreview.balanceBefore) : Number.POSITIVE_INFINITY;

  function adjustQuantityStep(deltaEntered: number) {
    const factor = selectedUnit?.factor_to_base ?? 1;
    let nextEntered = Math.max(1, quantityEntered + deltaEntered);
    if (movementType === "out" && maxOutBase >= 0) {
      const maxEntered = Math.max(1, Math.floor(maxOutBase / Math.max(1, factor)));
      nextEntered = Math.min(nextEntered, maxEntered);
    }
    setQuantityEntered(nextEntered);
  }

  const stockLabel =
    selectedProduct?.stock_quantity === null || selectedProduct?.stock_quantity === undefined
      ? "Sin saldo cargado (salidas usan 0 hasta la primera entrada)"
      : `En bodega: ${selectedProduct.stock_quantity.toLocaleString("es-CO")} u.`;

  return (
    <div
      className={cn(
        "rounded-xl border bg-muted/20 transition-shadow",
        compact ? "p-2" : "p-4 space-y-4",
        linePreview.violates
          ? "border-destructive/60 ring-2 ring-destructive/20"
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
                {(typeof lineQuantity === "number" ? lineQuantity : 0).toLocaleString("es-CO")}{" "}
                u. base
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
              <div className="space-y-2">
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 font-medium text-muted-foreground border border-border/80">
                    <Warehouse className="size-3.5 shrink-0" aria-hidden />
                    {stockLabel}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre (mín. 2 caracteres)"
                    className={inputClassName + " pl-9"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-invalid={fieldState.invalid}
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
              {selectedUnit ? (
                <span className="font-normal text-muted-foreground">
                  (en {selectedUnit.name})
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
                  title="Restar 1 unidad mostrada"
                >
                  <Minus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => adjustQuantityStep(1)}
                  title="Sumar 1 unidad mostrada"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 flex-1 min-w-0">
              {units.length > 1 ? (
                <>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className={inputClassName}
                      value={quantityEntered === 0 ? "" : String(quantityEntered)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setQuantityEntered(
                          v === "" ? 0 : Math.max(0, Math.floor(Number(v)))
                        );
                      }}
                      placeholder="0"
                      aria-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  <SearchCombobox
                    key={comboboxKey + "-unit"}
                    options={units.map((u) => ({
                      value: u.id,
                      label:
                        u.name +
                        (u.factor_to_base !== 1
                          ? ` (1 = ${u.factor_to_base} ${baseUnitName})`
                          : ""),
                    }))}
                    value={selectedUnit?.id ?? ""}
                    onChange={(id) => {
                      const u = units.find((x) => x.id === id);
                      if (u) setSelectedUnit(u);
                    }}
                    placeholder="Buscar unidad..."
                    inputClassName={inputClassName + " min-w-[120px]"}
                    emptyMessage="Ninguna unidad coincide."
                  />
                </>
              ) : (
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className={inputClassName}
                    value={quantityEntered === 0 ? "" : String(quantityEntered)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v === "" ? 0 : Math.max(0, Math.floor(Number(v)));
                      setQuantityEntered(n);
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                </FormControl>
              )}
              </div>
            </div>
            {showEquivalent ? (
              <p className="text-sm text-primary font-medium">
                Equivale a {Math.round(computedQuantity).toLocaleString("es-CO")}{" "}
                {baseUnitName} en bodega
              </p>
            ) : null}
            {selectedProduct && productId ? (
              <div className="space-y-2 rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">Saldo tras esta línea</span>
                  <span
                    className={cn(
                      "tabular-nums font-bold",
                      linePreview.violates ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {linePreview.balanceAfter.toLocaleString("es-CO")} u.
                  </span>
                </div>
                {movementType === "out" && linePreview.balanceBefore > 0 ? (
                  <Progress
                    value={linePreview.balanceAfter}
                    max={Math.max(linePreview.balanceBefore, 1)}
                    className="h-2 bg-muted"
                  />
                ) : null}
                {linePreview.violates ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    Quedaría negativo: ajustá cantidad o tipo.
                  </p>
                ) : null}
                {movementType === "out" && linePreview.balanceBefore === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    No hay unidades disponibles para salida en esta simulación.
                  </p>
                ) : null}
              </div>
            ) : null}
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`lines.${index}.historical_unit_cost`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-muted-foreground flex items-center gap-2">
              <CircleDollarSign className="size-4 text-primary shrink-0" aria-hidden />
              Costo unitario
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                className={inputClassName}
                {...field}
                value={
                  field.value === undefined || field.value === null
                    ? ""
                    : String(field.value)
                }
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? undefined : Number(v));
                }}
                aria-invalid={fieldState.invalid}
              />
            </FormControl>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
      </div>
    </div>
  );
}
