"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { SearchCombobox } from "@/components/ui/search-combobox";
import {
  transactionSchema,
  type TransactionFormValues,
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/app/dashboard/banks/schema";
import { createTransaction } from "@/app/dashboard/banks/actions";
import type { BankAccount, FinancialCategory } from "@/app/dashboard/banks/actions";

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Ingreso",
  expense: "Egreso",
};

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  categories: FinancialCategory[];
  onSuccess: () => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  bankAccounts,
  categories,
  onSuccess,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      bank_account_id: "",
      category_id: "",
      transaction_type: "income",
      amount: undefined as unknown as number,
      description: "",
      transaction_date: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      form.reset({
        bank_account_id: "",
        category_id: "",
        transaction_type: "income",
        amount: undefined as unknown as number,
        description: "",
        transaction_date: today,
      });
    }
  }, [open, form]);

  async function onSubmit(values: TransactionFormValues) {
    const result = await createTransaction(values);

    if (result.success) {
      toast.success("Movimiento registrado");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar el movimiento");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Registrar movimiento</SheetTitle>
          <SheetDescription>
            Registre un ingreso o egreso en una cuenta bancaria.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Cuenta Bancaria</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      key={open ? "open" : "closed"}
                      options={bankAccounts.map((b) => ({ value: b.id, label: b.name }))}
                      value={field.value != null ? String(field.value) : ""}
                      onChange={field.onChange}
                      placeholder="Buscar cuenta..."
                      emptyMessage="Ninguna cuenta coincide con la búsqueda."
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      key={open ? "open" : "closed"}
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      value={field.value != null ? String(field.value) : ""}
                      onChange={field.onChange}
                      placeholder="Buscar categoría..."
                      emptyMessage="Ninguna categoría coincide con la búsqueda."
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimiento</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      key={open ? "open" : "closed"}
                      options={TRANSACTION_TYPES.map((type) => ({
                        value: type,
                        label: TRANSACTION_TYPE_LABELS[type],
                      }))}
                      value={field.value != null ? String(field.value) : ""}
                      onChange={field.onChange}
                      placeholder="Buscar tipo..."
                      emptyMessage="Ningún tipo coincide."
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.01}
                      step={1}
                      placeholder="0"
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
              name="description"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Pago recibo de luz"
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
              name="transaction_date"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={(field.value as string) ?? ""}
                      aria-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando…" : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
