"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Wallet, Calendar, TrendingUp, Receipt, X, Save } from "lucide-react";
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
import { samitClosureSchema, type SamitClosureFormValues } from "@/app/dashboard/closures/samit/schema";
import { createSamitClosure } from "@/app/dashboard/closures/samit/actions";
import { motion } from "framer-motion";
import { localDateInputValue } from "@/lib/calendar-date";
import { formatCop } from "@/lib/format";

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

interface SamitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  suggestedInitialBalance?: number;
}

export function SamitForm({
  open,
  onOpenChange,
  onSuccess,
  suggestedInitialBalance = 0,
}: SamitFormProps) {
  const form = useForm<SamitClosureFormValues>({
    resolver: zodResolver(samitClosureSchema) as Resolver<SamitClosureFormValues>,
    defaultValues: {
      closure_date: "",
      initial_balance: 0,
      sales_total: 0,
      payments_total: 0,
    },
  });

  const initial = form.watch("initial_balance") ?? 0;
  const sales = form.watch("sales_total") ?? 0;
  const payments = form.watch("payments_total") ?? 0;
  const total = initial + sales - payments;

  React.useEffect(() => {
    if (open) {
      const today = localDateInputValue();
      form.reset({
        closure_date: today,
        initial_balance: suggestedInitialBalance,
        sales_total: 0,
        payments_total: 0,
      });
    }
  }, [open, form, suggestedInitialBalance]);

  async function onSubmit(values: SamitClosureFormValues) {
    const result = await createSamitClosure(values);
    if (result.success) {
      toast.success("Registro SAMIT guardado correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton
      >
        <DialogTitle className="sr-only">Registrar cierre SAMIT</DialogTitle>
        <DialogDescription className="sr-only">
          Saldo inicial, venta sistema, pagos y total.
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col"
        >
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <Wallet className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Registrar cierre SAMIT
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Saldo inicial, venta sistema, pagos. El total se arrastra al día siguiente.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="closure_date"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="size-4 text-primary shrink-0" />
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
                <FormField
                  control={form.control}
                  name="initial_balance"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Saldo inicial</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Se rellena con el total del último registro.
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
                        <TrendingUp className="size-4 text-primary shrink-0" />
                        Venta sistema
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
                  name="payments_total"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Receipt className="size-4 text-primary shrink-0" />
                        Pagos
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
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Total (saldo a arrastrar)
                  </p>
                  <p className="text-2xl font-black tabular-nums text-foreground">
                    {formatCop(total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saldo inicial + Venta sistema − Pagos
                  </p>
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
