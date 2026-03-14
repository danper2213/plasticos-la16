"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Package,
  Hash,
  CircleDollarSign,
  StickyNote,
  X,
  Save,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/ui/search-combobox";
import {
  movementSchema,
  type MovementFormValues,
  MOVEMENT_TYPES,
  type MovementType,
} from "@/app/dashboard/inventory/schema";
import { createMovement, searchProductsForMovement } from "@/app/dashboard/inventory/actions";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";
import { parsePackagingConversion } from "@/lib/parse-packaging";
import { triggerSuccess } from "@/lib/confetti";
import { motion } from "framer-motion";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

/** Unidad derivada del packaging parseado (ej. Caja x60 paq) para el selector del form. */
interface DerivedUnit {
  id: string;
  name: string;
  factor_to_base: number;
}

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MovementForm({ open, onOpenChange, onSuccess }: MovementFormProps) {
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: "",
      movement_type: "in",
      quantity: 1,
      historical_unit_cost: 0,
      notes: "",
    },
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductSearchHit | null>(null);
  const [searching, setSearching] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [units, setUnits] = React.useState<DerivedUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = React.useState<DerivedUnit | null>(null);
  const [quantityEntered, setQuantityEntered] = React.useState<number>(1);
  /** Cuando las unidades vienen del packaging parseado (ej. "Caja x60 paq"), label para la unidad base en el resumen */
  const [parsedBaseLabel, setParsedBaseLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      product_id: "",
      movement_type: "in",
      quantity: 1,
      historical_unit_cost: 0,
      notes: "",
    });
    setSearchQuery("");
    setSearchResults([]);
    setSelectedProduct(null);
    setUnits([]);
    setSelectedUnit(null);
    setQuantityEntered(1);
    setParsedBaseLabel(null);
  }, [open, form]);

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
      form.setValue("quantity", 1);
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
      form.setValue("quantity", Math.round(1 * parsed.factor));
      setParsedBaseLabel(parsed.baseLabel ?? null);
      return;
    }

    setUnits([]);
    setSelectedUnit(null);
    setQuantityEntered(1);
    form.setValue("quantity", 1);
    setParsedBaseLabel(null);
  }, [selectedProduct?.id, selectedProduct?.packaging, selectedProduct?.presentation, form]);

  React.useEffect(() => {
    const factor = selectedUnit?.factor_to_base ?? 1;
    const q = Number.isFinite(quantityEntered) && quantityEntered > 0 ? quantityEntered : 0;
    form.setValue("quantity", Math.round(q * factor), { shouldValidate: true });
  }, [quantityEntered, selectedUnit, form]);

  function handleSelectProduct(p: ProductSearchHit) {
    setSelectedProduct(p);
    form.setValue("product_id", p.id);
    form.setValue("historical_unit_cost", p.cost);
    setSearchResults([]);
    setSearchQuery("");
  }

  function handleClearProduct() {
    setSelectedProduct(null);
    form.setValue("product_id", "");
    form.setValue("historical_unit_cost", 0);
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

  async function onSubmit(values: MovementFormValues) {
    const result = await createMovement(values);
    if (result.success) {
      triggerSuccess();
      toast.success("Movimiento registrado correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar el movimiento");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">Registrar movimiento</DialogTitle>
        <DialogDescription className="sr-only">
          Registre una entrada, salida o ajuste de inventario.
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={modalSpring}
          className="flex flex-col"
        >
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <ArrowLeftRight className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Registrar movimiento
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Entrada, salida o ajuste de inventario.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Package className="size-4 text-primary shrink-0" aria-hidden />
                        Producto
                      </FormLabel>
                      {selectedProduct ? (
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
                  name="movement_type"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <ArrowLeftRight className="size-4 text-primary shrink-0" aria-hidden />
                        Tipo de movimiento
                      </FormLabel>
                      <FormControl>
                        <SearchCombobox
                          key={open ? "open" : "closed"}
                          options={MOVEMENT_TYPES.map((type) => ({
                            value: type,
                            label: MOVEMENT_TYPE_LABELS[type],
                          }))}
                          value={field.value != null ? String(field.value) : ""}
                          onChange={field.onChange}
                          placeholder="Buscar tipo..."
                          inputClassName={inputClassName}
                          emptyMessage="Ningún tipo coincide."
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
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
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                        {units.length > 1 ? (
                          <>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                className={inputClassName}
                                value={
                                  quantityEntered === 0 ? "" : String(quantityEntered)
                                }
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
                              key={open ? "open" : "closed"}
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
                              value={
                                quantityEntered === 0 ? "" : String(quantityEntered)
                              }
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
                      {showEquivalent ? (
                        <p className="text-sm text-primary font-medium">
                          Equivale a {Math.round(computedQuantity).toLocaleString("es-CO")}{" "}
                          {baseUnitName} en bodega
                        </p>
                      ) : null}
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="historical_unit_cost"
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
                          value={field.value === undefined || field.value === null ? "" : String(field.value)}
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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <StickyNote className="size-4 text-primary shrink-0" aria-hidden />
                        Observaciones (opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej. Factura 123, Mercancía dañada"
                          rows={3}
                          className="rounded-lg border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none transition-colors"
                          value={(field.value as string) ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={fieldState.invalid}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t border-border bg-muted/50 px-6 py-4 flex flex-wrap items-center justify-end gap-2 rounded-b-[24px]">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg border-border hover:bg-muted gap-2"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Save className="size-4" />
                  {form.formState.isSubmitting ? "Guardando…" : "Registrar"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
