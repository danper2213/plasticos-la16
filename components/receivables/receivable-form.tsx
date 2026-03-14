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
import { receivableSchema, type ReceivableFormValues } from "@/app/dashboard/receivables/schema";
import { createReceivable } from "@/app/dashboard/receivables/actions";
import type { ActiveCustomerOption } from "@/app/dashboard/receivables/actions";

interface ReceivableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: ActiveCustomerOption[];
  onSuccess: () => void;
}

export function ReceivableForm({
  open,
  onOpenChange,
  customers,
  onSuccess,
}: ReceivableFormProps) {
  const form = useForm<ReceivableFormValues>({
    resolver: zodResolver(receivableSchema),
    defaultValues: {
      customer_id: "",
      concept: "",
      external_invoice_number: "",
      total_amount: undefined as unknown as number,
      issue_date: "",
      due_date: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      form.reset({
        customer_id: "",
        concept: "",
        external_invoice_number: "",
        total_amount: undefined as unknown as number,
        issue_date: today,
        due_date: "",
      });
    }
  }, [open, form]);

  async function onSubmit(values: ReceivableFormValues) {
    const result = await createReceivable(values);

    if (result.success) {
      toast.success("Cuenta por cobrar registrada correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar la cuenta por cobrar");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nueva cuenta por cobrar</SheetTitle>
          <SheetDescription>
            Registre los datos de la cuenta por cobrar al cliente.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      key={open ? "open" : "closed"}
                      options={customers.map((c) => ({ value: c.id, label: c.name }))}
                      value={field.value != null ? String(field.value) : ""}
                      onChange={field.onChange}
                      placeholder="Buscar cliente..."
                      emptyMessage="Ningún cliente coincide con la búsqueda."
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="concept"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Concepto / Descripción</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Pedido 15 cajas"
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
              name="external_invoice_number"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Número de Factura (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Número de factura externa"
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
              name="total_amount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Valor Total</FormLabel>
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
              name="issue_date"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Fecha de Emisión</FormLabel>
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
            <FormField
              control={form.control}
              name="due_date"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
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
