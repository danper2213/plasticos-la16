"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  StickyNote,
  X,
  Save,
  Plus,
  Package,
  AlertTriangle,
  ClipboardList,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  batchInventoryMovementSchema,
  type BatchInventoryMovementFormValues,
  type MovementLineFormValues,
} from "@/app/dashboard/inventory/schema";
import { createMovementsBatch } from "@/app/dashboard/inventory/actions";
import { triggerSuccess } from "@/lib/confetti";
import { motion, AnimatePresence } from "framer-motion";
import { MovementFormLine } from "@/components/inventory/movement-form-line";
import { lineStockDelta } from "@/lib/inventory-stock-delta";
import { cn } from "@/lib/utils";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

function emptyLine(): MovementLineFormValues {
  return {
    product_id: "",
    movement_type: "in",
    quantity: 1,
    historical_unit_cost: 0,
  };
}

function buildLinePreviews(
  lines: BatchInventoryMovementFormValues["lines"],
  stockMap: Record<string, number | null>
): Array<{ balanceBefore: number; balanceAfter: number; violates: boolean }> {
  const running = new Map<string, number>();
  return lines.map((line) => {
    if (!line.product_id) {
      return { balanceBefore: 0, balanceAfter: 0, violates: false };
    }
    if (!running.has(line.product_id)) {
      running.set(line.product_id, stockMap[line.product_id] ?? 0);
    }
    const before = running.get(line.product_id)!;
    const after = before + lineStockDelta(line);
    running.set(line.product_id, after);
    return { balanceBefore: before, balanceAfter: after, violates: after < 0 };
  });
}

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MovementForm({ open, onOpenChange, onSuccess }: MovementFormProps) {
  const [stockMap, setStockMap] = React.useState<Record<string, number | null>>({});
  const [activeSection, setActiveSection] = React.useState<"lines" | "notes">("lines");
  /** Con varias líneas, solo una expandida; el resto se muestra comprimido. */
  const [focusedLineIndex, setFocusedLineIndex] = React.useState(0);

  const form = useForm<BatchInventoryMovementFormValues>({
    resolver: zodResolver(batchInventoryMovementSchema),
    defaultValues: {
      global_notes: "",
      lines: [emptyLine()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const linesW = form.watch("lines");
  const registerProductStock = React.useCallback((id: string, stock: number | null) => {
    setStockMap((prev) => ({ ...prev, [id]: stock }));
  }, []);

  const linePreviews = React.useMemo(
    () => buildLinePreviews(linesW, stockMap),
    [linesW, stockMap]
  );
  const hasStockViolation = linePreviews.some((p) => p.violates);

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      global_notes: "",
      lines: [emptyLine()],
    });
    setStockMap({});
    setActiveSection("lines");
    setFocusedLineIndex(0);
  }, [open, form]);

  React.useEffect(() => {
    if (fields.length <= 1) {
      setFocusedLineIndex(0);
      return;
    }
    setFocusedLineIndex((i) => (i >= fields.length ? fields.length - 1 : i));
  }, [fields.length]);

  function appendLine() {
    const nextIndex = fields.length;
    append(emptyLine());
    setFocusedLineIndex(nextIndex);
  }

  async function onSubmit(values: BatchInventoryMovementFormValues) {
    const result = await createMovementsBatch(values);
    if (result.success) {
      triggerSuccess();
      const n = result.count;
      toast.success(
        n === 1 ? "Movimiento registrado correctamente" : `Se registraron ${n} movimientos`
      );
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar los movimientos");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-2xl w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={true}
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
          className="flex flex-col"
        >
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <div className="mx-auto flex max-w-md gap-2 rounded-xl bg-background/80 p-1 shadow-sm">
                  <Button
                    type="button"
                    variant={activeSection === "lines" ? "default" : "ghost"}
                    className={cn(
                      "flex-1 gap-2 rounded-lg",
                      activeSection === "lines" && "shadow-sm"
                    )}
                    onClick={() => setActiveSection("lines")}
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
                    onClick={() => setActiveSection("notes")}
                  >
                    <StickyNote className="size-4 shrink-0" />
                    Notas del lote
                  </Button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
                {activeSection === "lines" ? (
                  <>
                    <div className="space-y-4">
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
                    >
                      <Plus className="size-4" />
                      Agregar otro producto
                    </Button>

                    {hasStockViolation ? (
                      <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertTriangle className="size-5 shrink-0 mt-0.5" aria-hidden />
                        <div>
                          <p className="font-semibold">Saldo negativo en una o más líneas</p>
                          <p className="mt-1 text-destructive/90">
                            Corregí cantidades o tipo (entrada/salida) antes de guardar. El servidor
                            también rechaza saldos negativos.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200/90">
                        <Package className="size-5 shrink-0 mt-0.5" aria-hidden />
                        <p>
                          Cada línea muestra el <strong>saldo simulado</strong> tras aplicar el
                          comprobante en orden. Si repetís el mismo producto en varias líneas, el
                          saldo se acumula.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
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
                )}
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
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-4" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || hasStockViolation}
                    className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    <Save className="size-4" />
                    {form.formState.isSubmitting
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
  );
}
