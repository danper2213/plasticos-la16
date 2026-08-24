"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  StickyNote,
  X,
  Save,
  Plus,
  AlertTriangle,
  ClipboardList,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  parseMovementFormValues,
  type BatchInventoryMovementFormValues,
  type MovementLineFormValues,
} from "@/app/dashboard/inventory/schema";
import { createMovementsBatch } from "@/app/dashboard/inventory/actions";
import { triggerSuccess } from "@/lib/confetti";
import { motion, AnimatePresence } from "framer-motion";
import { MovementFormLine } from "@/components/inventory/movement-form-line";
import { MovementProcessingOverlay } from "@/components/inventory/movement-processing-overlay";
import { buildLinePreviews } from "@/lib/inventory-movement-preview";
import { isMovementFormDirty } from "@/lib/inventory-movement-form-dirty";
import { toStockNumber } from "@/lib/inventory-quantity";
import { cn } from "@/lib/utils";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

function emptyLine(): MovementLineFormValues {
  return {
    product_id: "",
    movement_type: "in",
    quantity: 1,
    quantity_unit: "pack",
    historical_unit_cost: 0,
  };
}

interface StockMapEntry {
  quantity: number | null;
  packaging: string | null;
  presentation: string | null;
}

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Tipo de movimiento preseleccionado al abrir (p. ej. desde el hero). */
  initialMovementType?: MovementLineFormValues["movement_type"];
}

export function MovementForm({
  open,
  onOpenChange,
  onSuccess,
  onDirtyChange,
  initialMovementType = "in",
}: MovementFormProps) {
  const [stockMap, setStockMap] = React.useState<Record<string, StockMapEntry>>({});
  const [activeSection, setActiveSection] = React.useState<"lines" | "notes">("lines");
  /** Con varias líneas, solo una expandida; el resto se muestra comprimido. */
  const [focusedLineIndex, setFocusedLineIndex] = React.useState(0);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const submitLockRef = React.useRef(false);
  const submitRequestIdRef = React.useRef<string | null>(null);

  const form = useForm<BatchInventoryMovementFormValues>({
    defaultValues: {
      global_notes: "",
      lines: [emptyLine()],
    },
    shouldUnregister: true,
    mode: "onSubmit",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
    shouldUnregister: true,
  });

  const globalNotesW = form.watch("global_notes");
  const watchedLines = fields.map((_, index) => ({
    product_id: form.watch(`lines.${index}.product_id`),
    movement_type: form.watch(`lines.${index}.movement_type`),
    quantity: form.watch(`lines.${index}.quantity`),
    quantity_unit: form.watch(`lines.${index}.quantity_unit`),
    packaging: (() => {
      const pid = form.watch(`lines.${index}.product_id`);
      return pid ? stockMap[pid]?.packaging ?? null : null;
    })(),
    historical_unit_cost: form.watch(`lines.${index}.historical_unit_cost`),
  }));
  const busy = isSaving;

  const isDirty = React.useMemo(
    () =>
      isMovementFormDirty({
        global_notes: globalNotesW,
        lines: watchedLines,
      }),
    [globalNotesW, watchedLines],
  );

  React.useEffect(() => {
    onDirtyChange?.(open && isDirty);
  }, [open, isDirty, onDirtyChange]);

  const registerProductStock = React.useCallback(
    (
      id: string,
      stock: number | null,
      meta?: { packaging?: string | null; presentation?: string | null },
    ) => {
      setStockMap((prev) => ({
        ...prev,
        [id]: {
          quantity: stock == null ? null : toStockNumber(stock),
          packaging: meta?.packaging ?? prev[id]?.packaging ?? null,
          presentation: meta?.presentation ?? prev[id]?.presentation ?? null,
        },
      }));
    },
    [],
  );

  function closeForm() {
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  function requestClose() {
    if (busy) return;
    if (isDirty) {
      setDiscardDialogOpen(true);
      return;
    }
    closeForm();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestClose();
  }

  const linePreviews = React.useMemo(() => {
    const stockByProductId: Record<string, number | null> = {};
    for (const [id, entry] of Object.entries(stockMap)) {
      stockByProductId[id] = entry.quantity;
    }
    return buildLinePreviews(watchedLines, stockByProductId);
  }, [watchedLines, stockMap]);
  const hasStockViolation = linePreviews.some((p) => p.violates);

  React.useEffect(() => {
    if (!open) return;
    submitRequestIdRef.current = crypto.randomUUID();
    setIsSaving(false);
    submitLockRef.current = false;
    form.reset({
      global_notes: "",
      lines: [{ ...emptyLine(), movement_type: initialMovementType }],
    });
    setStockMap({});
    setActiveSection("lines");
    setFocusedLineIndex(0);
  }, [open, form, initialMovementType]);

  React.useEffect(() => {
    if (fields.length <= 1) {
      setFocusedLineIndex(0);
      return;
    }
    setFocusedLineIndex((i) => (i >= fields.length ? fields.length - 1 : i));
  }, [fields.length]);

  function appendLine() {
    if (busy) return;
    const nextIndex = fields.length;
    append(emptyLine());
    setFocusedLineIndex(nextIndex);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || submitLockRef.current) return;
    submitLockRef.current = true;

    try {
      const raw: BatchInventoryMovementFormValues = {
        global_notes: form.getValues("global_notes"),
        lines: fields.map((_, index) => form.getValues(`lines.${index}`)),
        idempotency_key: submitRequestIdRef.current ?? undefined,
      };

      if (hasStockViolation) {
        toast.error("No se puede registrar: una o más líneas superan el stock disponible");
        return;
      }

      const parsed = parseMovementFormValues(raw);
      if (!parsed.success) {
        toast.error(parsed.message);
        return;
      }

      const ids = parsed.data.lines.map((l) => l.product_id);
      const duplicateProducts = ids.length !== new Set(ids).size;
      if (duplicateProducts) {
        toast.error(
          "Hay varias líneas con el mismo producto: el stock se descuenta en cada línea. Revisá las líneas ocultas o unificá en una sola.",
        );
        return;
      }

      form.clearErrors();
      setIsSaving(true);
      await onSubmit(parsed.data);
    } finally {
      setIsSaving(false);
      submitLockRef.current = false;
    }
  }

  async function onSubmit(values: BatchInventoryMovementFormValues) {
    const payload: BatchInventoryMovementFormValues = {
      ...values,
      idempotency_key: submitRequestIdRef.current ?? values.idempotency_key,
    };
    const result = await createMovementsBatch(payload);
    if (result.success) {
      triggerSuccess();
      const n = result.count;
      const stockMsg =
        result.stockUpdates?.length === 1
          ? (() => {
              const u = result.stockUpdates[0]!;
              const op =
                u.delta < 0
                  ? `${u.stockBefore} − ${Math.abs(u.delta)} = ${u.stockAfter}`
                  : u.delta > 0
                    ? `${u.stockBefore} + ${u.delta} = ${u.stockAfter}`
                    : `${u.stockBefore} → ${u.stockAfter}`;
              return ` (${op} Cjs)`;
            })()
          : result.stockUpdates && result.stockUpdates.length > 1
            ? ` Stock actualizado en ${result.stockUpdates.length} productos.`
            : "";
      const dedupMsg =
        "deduplicated" in result && result.deduplicated
          ? " (ya estaba guardado, no se duplicó)"
          : "";
      toast.success(
        (n === 1 ? "Movimiento registrado correctamente" : `Se registraron ${n} movimientos`) +
          dedupMsg +
          stockMsg,
      );
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar los movimientos");
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-2xl w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={!busy}
        onInteractOutside={(e) => {
          if (isDirty || busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          if (isDirty) {
            e.preventDefault();
            setDiscardDialogOpen(true);
          }
        }}
      >
        <DialogTitle className="sr-only">Registrar movimientos de inventario</DialogTitle>
        <DialogDescription className="sr-only">
          Registre una o varias entradas, salidas o ajustes en un solo guardado. El stock no puede
          quedar negativo.
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={modalSpring}
          className="relative flex flex-col"
        >
          {busy ? <MovementProcessingOverlay lineCount={fields.length} /> : null}
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <ArrowLeftRight className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Registrar movimientos
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Comprobante con varios productos. Salidas validadas contra stock en bodega.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex flex-col">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <div className="mx-auto flex max-w-md gap-2 rounded-xl bg-background/80 p-1 shadow-sm">
                  <Button
                    type="button"
                    variant={activeSection === "lines" ? "default" : "ghost"}
                    className={cn(
                      "flex-1 gap-2 rounded-lg",
                      activeSection === "lines" && "shadow-sm"
                    )}
                    onClick={() => !busy && setActiveSection("lines")}
                    disabled={busy}
                  >
                    <ClipboardList className="size-4 shrink-0" />
                    Productos ({fields.length})
                  </Button>
                  <Button
                    type="button"
                    variant={activeSection === "notes" ? "default" : "ghost"}
                    className={cn(
                      "flex-1 gap-2 rounded-lg",
                      activeSection === "notes" && "shadow-sm"
                    )}
                    onClick={() => !busy && setActiveSection("notes")}
                    disabled={busy}
                  >
                    <StickyNote className="size-4 shrink-0" />
                    Notas del lote
                  </Button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[58vh] space-y-3">
                <div className={cn("space-y-3", activeSection !== "lines" && "hidden")}>
                  <>
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {fields.map((field, index) => (
                          <motion.div
                            key={field.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                          >
                            <MovementFormLine
                              index={index}
                              lineKey={field.id}
                              dialogOpen={open}
                              canRemove={fields.length > 1}
                              onRemove={() => remove(index)}
                              linePreview={
                                linePreviews[index] ?? {
                                  balanceBefore: 0,
                                  balanceAfter: 0,
                                  violates: false,
                                }
                              }
                              onRegisterProductStock={registerProductStock}
                              showCollapseChrome={fields.length > 1}
                              isCollapsed={fields.length > 1 && index !== focusedLineIndex}
                              onActivateLine={() => setFocusedLineIndex(index)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg border-dashed gap-2"
                      onClick={appendLine}
                      disabled={busy}
                    >
                      <Plus className="size-4" />
                      Agregar otro producto
                    </Button>

                    {hasStockViolation ? (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
                        <p>Revisá el stock: una salida supera lo disponible en caja/paca.</p>
                      </div>
                    ) : null}
                  </>
                </div>

                <div className={cn(activeSection !== "notes" && "hidden")}>
                  <FormField
                    control={form.control}
                    name="global_notes"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <StickyNote className="size-4 text-primary shrink-0" aria-hidden />
                          Observaciones del lote (opcional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ej. Factura 123 — aplica a todos los movimientos de este guardado"
                            rows={8}
                            className="rounded-lg border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none transition-colors min-h-[200px]"
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
              </div>

              <div className="border-t border-border bg-muted/50 px-6 py-4 flex flex-col gap-3 rounded-b-[24px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {fields.length} producto{fields.length === 1 ? "" : "s"}
                  {hasStockViolation ? (
                    <span className="ml-2 font-medium text-destructive">· Revisá el stock</span>
                  ) : null}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg border-border hover:bg-muted gap-2"
                    disabled={busy}
                    onClick={requestClose}
                  >
                    <X className="size-4" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || hasStockViolation}
                    className={cn(
                      "rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2",
                      hasStockViolation && !busy && "opacity-60",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {busy
                      ? "Guardando…"
                      : fields.length === 1
                        ? "Registrar"
                        : `Guardar ${fields.length} movimientos`}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar movimientos?</AlertDialogTitle>
          <AlertDialogDescription>
            Tenés productos o notas cargadas que aún no se guardaron. Si cerrás ahora, se
            perderán esos datos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir editando</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              closeForm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Descartar y cerrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
