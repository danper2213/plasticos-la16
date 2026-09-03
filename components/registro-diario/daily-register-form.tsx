"use client";

import * as React from "react";
import { useForm, type Resolver, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Wallet,
  Pencil,
  Calendar,
  TrendingUp,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  X,
  Save,
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
  dailyRegisterSchema,
  type DailyRegisterFormValues,
} from "@/app/dashboard/registro-diario/schema";
import {
  createDailyRegister,
  updateDailyRegister,
} from "@/app/dashboard/registro-diario/actions";
import {
  buildDailyAdvice,
  computeDailyRegister,
  CUADRE_TOLERANCE_COP,
  samitDifferenceLabel,
} from "@/app/dashboard/registro-diario/calc";
import { DailyAdviceList } from "@/components/registro-diario/daily-advice-list";
import { localDateInputValue } from "@/lib/calendar-date";
import { formatCop } from "@/lib/format";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

function formatAmountDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const [intPart, decPart] = String(value).split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${withDots},${decPart.slice(0, 2)}` : withDots;
}

function parseAmountInput(input: string): number | undefined {
  const trimmed = input.trim().replace(/\s/g, "");
  if (trimmed === "") return undefined;
  const withoutThousands = trimmed.replace(/\./g, "");
  const withDecimalDot = withoutThousands.replace(",", ".");
  const num = parseFloat(withDecimalDot);
  return Number.isNaN(num) ? undefined : num;
}

interface DailyRegisterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  suggestedPreviousBalance?: number;
  editingRegisterId?: string | null;
  initialValues?: DailyRegisterFormValues | null;
}

interface AmountFieldProps {
  control: Control<DailyRegisterFormValues>;
  name: keyof DailyRegisterFormValues;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  allowNegative?: boolean;
}

function AmountField({
  control,
  name,
  label,
  icon,
  hint,
  allowNegative = false,
}: AmountFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="text-muted-foreground flex items-center gap-2">
            {icon}
            {label}
          </FormLabel>
          {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0 o 0,00"
              className={inputClassName}
              value={formatAmountDisplay(field.value as number | undefined)}
              onChange={(e) => {
                const parsed = parseAmountInput(e.target.value);
                if (parsed === undefined) {
                  field.onChange(0);
                  return;
                }
                field.onChange(allowNegative ? parsed : Math.max(0, parsed));
              }}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
            />
          </FormControl>
          <FormMessage>{fieldState.error?.message}</FormMessage>
        </FormItem>
      )}
    />
  );
}

export function DailyRegisterForm({
  open,
  onOpenChange,
  onSuccess,
  suggestedPreviousBalance = 0,
  editingRegisterId = null,
  initialValues = null,
}: DailyRegisterFormProps) {
  const form = useForm<DailyRegisterFormValues>({
    resolver: zodResolver(dailyRegisterSchema) as Resolver<DailyRegisterFormValues>,
    defaultValues: {
      register_date: "",
      previous_balance: 0,
      samit_sales_total: 0,
      cash_total: 0,
      transfers_total: 0,
      expenses_total: 0,
      payments_total: 0,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    if (editingRegisterId && initialValues) {
      form.reset(initialValues);
    } else {
      form.reset({
        register_date: localDateInputValue(),
        previous_balance: suggestedPreviousBalance,
        samit_sales_total: 0,
        cash_total: 0,
        transfers_total: 0,
        expenses_total: 0,
        payments_total: 0,
      });
    }
  }, [open, form, suggestedPreviousBalance, editingRegisterId, initialValues]);

  const watched = form.watch();
  const derived = computeDailyRegister({
    previous_balance: watched.previous_balance ?? 0,
    samit_sales_total: watched.samit_sales_total ?? 0,
    cash_total: watched.cash_total ?? 0,
    transfers_total: watched.transfers_total ?? 0,
    expenses_total: watched.expenses_total ?? 0,
    payments_total: watched.payments_total ?? 0,
  });
  const advice = buildDailyAdvice(
    {
      previous_balance: watched.previous_balance ?? 0,
      samit_sales_total: watched.samit_sales_total ?? 0,
      cash_total: watched.cash_total ?? 0,
      transfers_total: watched.transfers_total ?? 0,
      expenses_total: watched.expenses_total ?? 0,
      payments_total: watched.payments_total ?? 0,
    },
    derived
  );
  const diffLabel = samitDifferenceLabel(derived.samitDifference);

  async function onSubmit(values: DailyRegisterFormValues) {
    const result = editingRegisterId
      ? await updateDailyRegister(editingRegisterId, values)
      : await createDailyRegister(values);
    if (result.success) {
      toast.success(
        editingRegisterId ? "Registro actualizado correctamente" : "Registro guardado correctamente"
      );
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(
        result.error ??
          (editingRegisterId ? "Error al actualizar el registro" : "Error al guardar el registro")
      );
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
          {editingRegisterId ? "Editar registro diario" : "Registrar día"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Venta SAMIT, efectivo, transferencias, gastos y pagos. El saldo se arrastra al día siguiente.
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
                {editingRegisterId ? <Pencil className="size-6" /> : <Wallet className="size-6" />}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  {editingRegisterId ? "Editar registro del día" : "Registrar día"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Venta SAMIT, efectivo, transferencias, gastos y pagos. El saldo se arrastra.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                <FormField
                  control={form.control}
                  name="register_date"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="size-4 text-primary shrink-0" aria-hidden />
                        Fecha
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

                <AmountField
                  control={form.control}
                  name="previous_balance"
                  label="Saldo anterior"
                  hint="Se rellena con el saldo a arrastrar del último registro. Puede editarlo."
                  allowNegative
                />
                <AmountField
                  control={form.control}
                  name="samit_sales_total"
                  label="Total venta SAMIT"
                  icon={<TrendingUp className="size-4 text-primary shrink-0" aria-hidden />}
                />
                <AmountField
                  control={form.control}
                  name="cash_total"
                  label="Total efectivo"
                  icon={<Banknote className="size-4 text-primary shrink-0" aria-hidden />}
                />
                <AmountField
                  control={form.control}
                  name="transfers_total"
                  label="Total transferencias"
                  icon={<ArrowDownCircle className="size-4 text-primary shrink-0" aria-hidden />}
                />
                <AmountField
                  control={form.control}
                  name="expenses_total"
                  label="Total gastos"
                  icon={<ArrowUpCircle className="size-4 text-primary shrink-0" aria-hidden />}
                />
                <AmountField
                  control={form.control}
                  name="payments_total"
                  label="Total pagos"
                  icon={<Receipt className="size-4 text-primary shrink-0" aria-hidden />}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Recaudado
                    </p>
                    <p className="text-lg font-black tabular-nums text-foreground">
                      {formatCop(derived.collected)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Efectivo + transferencias</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Diferencia vs SAMIT
                    </p>
                    <p
                      className={cn(
                        "text-lg font-black tabular-nums",
                        derived.samitDifference > CUADRE_TOLERANCE_COP
                          ? "text-red-500"
                          : derived.samitDifference < -CUADRE_TOLERANCE_COP
                            ? "text-amber-500"
                            : "text-foreground"
                      )}
                    >
                      {formatCop(Math.abs(derived.samitDifference))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{diffLabel}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Saldo a arrastrar
                    </p>
                    <p
                      className={cn(
                        "text-lg font-black tabular-nums",
                        derived.endingBalance < 0 ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {formatCop(derived.endingBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Para el día siguiente</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Consejos para mañana
                  </p>
                  <DailyAdviceList items={advice} compact />
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
                    : editingRegisterId
                      ? "Actualizar registro"
                      : "Guardar registro"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
