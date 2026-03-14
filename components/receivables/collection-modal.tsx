"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { SearchCombobox } from "@/components/ui/search-combobox";
import {
  receivablePaymentSchema,
  type ReceivablePaymentFormValues,
} from "@/app/dashboard/receivables/schema";
import { createReceivablePayment } from "@/app/dashboard/receivables/actions";
import type { ReceivableWithCustomer } from "@/app/dashboard/receivables/actions";
import type { BankAccountOption } from "@/app/dashboard/receivables/actions";

interface CollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: ReceivableWithCustomer | null;
  bankAccounts: BankAccountOption[];
  onSuccess: () => void;
}

export function CollectionModal({
  open,
  onOpenChange,
  receivable,
  bankAccounts,
  onSuccess,
}: CollectionModalProps) {
  const form = useForm<ReceivablePaymentFormValues>({
    resolver: zodResolver(receivablePaymentSchema),
    defaultValues: {
      amount_received: 0,
      destination_of_funds: "",
      payment_date: new Date().toISOString().slice(0, 10),
    },
  });

  React.useEffect(() => {
    if (open && receivable) {
      form.reset({
        amount_received: receivable.total_amount,
        destination_of_funds: "",
        payment_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, receivable, form]);

  async function onSubmit(values: ReceivablePaymentFormValues) {
    if (!receivable) return;
    const result = await createReceivablePayment(values, receivable.id);

    if (result.success) {
      toast.success("Recaudo registrado correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al registrar el recaudo");
    }
  }

  if (!receivable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar recaudo</DialogTitle>
          <DialogDescription>
            {receivable.customer_name} · {receivable.concept}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="amount_received"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Monto a Recaudar</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
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
              name="destination_of_funds"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Destino de Fondos</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      key={open ? "open" : "closed"}
                      options={bankAccounts.map((b) => ({ value: b.name, label: b.name }))}
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
              name="payment_date"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Fecha de Pago</FormLabel>
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
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando…" : "Registrar recaudo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
