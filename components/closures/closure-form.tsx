"use client";

import * as React from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Wallet,
  Calendar,
  TrendingUp,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  StickyNote,
  X,
  Save,
  Plus,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  closureSchema,
  type ClosureFormValues,
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  type ExpenseCategory,
} from "@/app/dashboard/closures/schema";
import { createClosure } from "@/app/dashboard/closures/actions";
import { motion } from "framer-motion";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

interface ClosureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const defaultExpense = { amount: 0, category: "otros" as ExpenseCategory, description: "" };

export function ClosureForm({ open, onOpenChange, onSuccess }: ClosureFormProps) {
  const form = useForm<ClosureFormValues>({
    resolver: zodResolver(closureSchema) as Resolver<ClosureFormValues>,
    defaultValues: {
      closure_date: "",
      sales_total: 0,
      payments_total: 0,
      initial_balance: 0,
      expenses: [],
      system_total_income: undefined as unknown as number,
      actual_physical_balance: undefined as unknown as number,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenses",
  });

  React.useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      form.reset({
        closure_date: today,
        sales_total: 0,
        payments_total: 0,
        initial_balance: 0,
        expenses: [],
        system_total_income: undefined as unknown as number,
        actual_physical_balance: undefined as unknown as number,
        notes: "",
      });
    }
  }, [open, form]);

  const totalGastos = form.watch("expenses").reduce((s, e) => s + (e?.amount ?? 0), 0);

  async function onSubmit(values: ClosureFormValues) {
    const result = await createClosure(values);
    if (result.success) {
      toast.success("Cierre registrado correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar el cierre");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">Registrar cierre de caja</DialogTitle>
        <DialogDescription className="sr-only">
          Ventas y pagos del sistema (Hoja A), gastos por categoría, entradas y efectivo (Hoja B).
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
                <Wallet className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Registrar cierre de caja
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Ventas/pagos del sistema (Hoja A) y caja con gastos por categoría (Hoja B).
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
                {/* ——— Bloque 1: Ventas y pagos (Hoja A) ——— */}
                <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    Ventas y pagos del día (sistema / DIAN)
                  </h3>
                  <FormField
                    control={form.control}
                    name="closure_date"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="size-4 text-primary shrink-0" aria-hidden />
                          Fecha del cierre
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className={inputClassName}
                            {...field}
                            value={(field.value as string) ?? ""}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sales_total"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="size-4 text-primary shrink-0" aria-hidden />
                          Total ventas del día (POS/sistema)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            className={inputClassName}
                            value={field.value === undefined || field.value === null ? "" : String(field.value)}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? 0 : Number(v));
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
                    name="payments_total"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Receipt className="size-4 text-primary shrink-0" aria-hidden />
                          Total pagos del día (facturas, transporte)
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Pagos registrables ante DIAN.
                        </p>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            className={inputClassName}
                            value={field.value === undefined || field.value === null ? "" : String(field.value)}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? 0 : Number(v));
                            }}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                </div>

                {/* ——— Bloque 2: Caja y gastos (Hoja B) ——— */}
                <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Wallet className="size-4 text-primary" />
                    Caja y gastos por categoría
                  </h3>
                  <FormField
                    control={form.control}
                    name="initial_balance"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Saldo inicial</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            className={inputClassName}
                            value={field.value === undefined || field.value === null ? "" : String(field.value)}
                            onChange={(e) => {
                              const v = e.target.value;
                              field.onChange(v === "" ? 0 : Number(v));
                            }}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <ArrowUpCircle className="size-4 text-primary shrink-0" />
                        Gastos del día (por categoría)
                      </FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => append(defaultExpense)}
                      >
                        <Plus className="size-3.5" />
                        Agregar gasto
                      </Button>
                    </div>
                    {fields.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        Sin gastos. Use &quot;Agregar gasto&quot; para registrar comida, transporte, compras, etc.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {fields.map((item, index) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background p-2"
                          >
                            <FormField
                              control={form.control}
                              name={`expenses.${index}.amount`}
                              render={({ field: f, fieldState: fs }) => (
                                <FormItem className="flex-1 min-w-[80px]">
                                  <FormLabel className="text-xs">Monto</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      placeholder="0"
                                      className="h-9 rounded-md"
                                      value={f.value === undefined || f.value === null ? "" : String(f.value)}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        f.onChange(v === "" ? 0 : Number(v));
                                      }}
                                      aria-invalid={fs.invalid}
                                    />
                                  </FormControl>
                                  <FormMessage>{fs.error?.message}</FormMessage>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`expenses.${index}.category`}
                              render={({ field: f }) => (
                                <FormItem className="w-[130px]">
                                  <FormLabel className="text-xs">Categoría</FormLabel>
                                  <Select onValueChange={f.onChange} value={String(f.value ?? "")}>
                                    <FormControl>
                                      <SelectTrigger className="h-9 rounded-md">
                                        <SelectValue placeholder="Categoría" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {EXPENSE_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                          {expenseCategoryLabel[cat]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`expenses.${index}.description`}
                              render={({ field: f }) => (
                                <FormItem className="flex-1 min-w-[100px]">
                                  <FormLabel className="text-xs">Descripción (opc.)</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ej. Almuerzo"
                                      className="h-9 rounded-md"
                                      value={typeof f.value === "string" ? f.value : ""}
                                      onChange={(e) => f.onChange(e.target.value)}
                                      onBlur={f.onBlur}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(index)}
                              aria-label="Quitar gasto"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {fields.length > 0 && (
                      <p className="text-xs font-semibold text-foreground mt-2">
                        Total gastos: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(totalGastos)}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="system_total_income"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <ArrowDownCircle className="size-4 text-primary shrink-0" aria-hidden />
                          Total entradas (transferencias)
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Nequi, Bancolombia, Banco Bogotá, etc.
                        </p>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            className={inputClassName}
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
                    name="actual_physical_balance"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Banknote className="size-4 text-primary shrink-0" aria-hidden />
                          Total efectivo en caja
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Efectivo contado físicamente al cierre.
                        </p>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            className={inputClassName}
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
                </div>

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
                          placeholder="Ej. Faltan 2 mil pesos del cambio"
                          rows={2}
                          className="rounded-lg border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 resize-none transition-colors"
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
                  {form.formState.isSubmitting ? "Guardando…" : "Registrar cierre"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
