"use client";

import * as React from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Wallet,
  Pencil,
  Calendar,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
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
import { createClosure, updateClosure } from "@/app/dashboard/closures/actions";
import { localDateInputValue } from "@/lib/calendar-date";
import { motion } from "framer-motion";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

/** Formatea un número con punto cada 3 dígitos (ej. 1234567 → "1.234.567") y opcionalmente decimales con coma */
function formatAmountDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const [intPart, decPart] = String(value).split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${withDots},${decPart.slice(0, 2)}` : withDots;
}

/** Parsea el valor del input (quita puntos de miles, coma como decimal) a número */
function parseAmountInput(input: string): number | undefined {
  const trimmed = input.trim().replace(/\s/g, "");
  if (trimmed === "") return undefined;
  const withoutThousands = trimmed.replace(/\./g, "");
  const withDecimalDot = withoutThousands.replace(",", ".");
  const num = parseFloat(withDecimalDot);
  return Number.isNaN(num) ? undefined : num;
}

interface ClosureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Saldo esperado caja del último cierre; se usa como Saldo inicial al abrir un registro nuevo */
  suggestedInitialBalance?: number;
  editingClosureId?: string | null;
  initialValues?: ClosureFormValues | null;
}

const defaultExpense = { amount: 0, category: "otros" as ExpenseCategory, description: "" };

export function ClosureForm({
  open,
  onOpenChange,
  onSuccess,
  suggestedInitialBalance = 0,
  editingClosureId = null,
  initialValues = null,
}: ClosureFormProps) {
  const form = useForm<ClosureFormValues>({
    resolver: zodResolver(closureSchema) as Resolver<ClosureFormValues>,
    defaultValues: {
      closure_date: "",
      initial_balance: 0,
      sales_total: 0,
      system_total_income: undefined as unknown as number,
      expenses: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenses",
  });

  React.useEffect(() => {
    if (open) {
      if (editingClosureId && initialValues) {
        form.reset(initialValues);
      } else {
        const today = localDateInputValue();
        form.reset({
          closure_date: today,
          initial_balance: suggestedInitialBalance,
          sales_total: 0,
          system_total_income: undefined as unknown as number,
          expenses: [],
        });
      }
    }
  }, [open, form, suggestedInitialBalance, editingClosureId, initialValues]);

  const totalGastos = form.watch("expenses").reduce((s, e) => s + (e?.amount ?? 0), 0);

  async function onSubmit(values: ClosureFormValues) {
    const result = editingClosureId
      ? await updateClosure(editingClosureId, values)
      : await createClosure(values);
    if (result.success) {
      toast.success(editingClosureId ? "Cierre actualizado correctamente" : "Cierre registrado correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? (editingClosureId ? "Error al actualizar el cierre" : "Error al registrar el cierre"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">
          {editingClosureId ? "Editar cierre de caja" : "Registrar cierre de caja"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Registro diario: venta en efectivo, entradas por transferencia y gastos por categoría. El saldo se arrastra.
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
                  {editingClosureId ? <Pencil className="size-6" /> : <Wallet className="size-6" />}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                    {editingClosureId ? "Editar cierre del día" : "Registrar cierre del día"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Venta en efectivo, entradas por transferencia y gastos por categoría. El saldo se arrastra al día siguiente.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
                <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
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
                    name="initial_balance"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Saldo inicial (arrastrado del día anterior)</FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Se rellena con el saldo esperado del último cierre. Puede editarlo si es necesario.
                        </p>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0 o 0,00"
                            className={inputClassName}
                            value={formatAmountDisplay(field.value as number | undefined)}
                            onChange={(e) => {
                              const parsed = parseAmountInput(e.target.value);
                              field.onChange(parsed === undefined ? 0 : parsed);
                            }}
                            onBlur={field.onBlur}
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
                          Venta en efectivo
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0 o 0,00"
                            className={inputClassName}
                            value={formatAmountDisplay(field.value as number | undefined)}
                            onChange={(e) => {
                              const parsed = parseAmountInput(e.target.value);
                              field.onChange(parsed === undefined ? 0 : parsed);
                            }}
                            onBlur={field.onBlur}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="system_total_income"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <ArrowDownCircle className="size-4 text-primary shrink-0" aria-hidden />
                          Entradas por transferencia
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Nequi, Bancolombia, Banco Bogotá, etc.
                        </p>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0 o 0,00"
                            className={inputClassName}
                            value={formatAmountDisplay(field.value as number | undefined)}
                            onChange={(e) => {
                              const parsed = parseAmountInput(e.target.value);
                              field.onChange(parsed === undefined ? (undefined as unknown as number) : parsed);
                            }}
                            onBlur={field.onBlur}
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
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0 o 0,00"
                                      className="h-9 rounded-md"
                                      value={formatAmountDisplay(f.value as number | undefined)}
                                      onChange={(e) => {
                                        const parsed = parseAmountInput(e.target.value);
                                        f.onChange(parsed === undefined ? 0 : parsed);
                                      }}
                                      onBlur={f.onBlur}
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
                </div>
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
                  {form.formState.isSubmitting
                    ? "Guardando…"
                    : editingClosureId
                      ? "Actualizar cierre"
                      : "Registrar cierre"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
