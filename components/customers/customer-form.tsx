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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { customerSchema, type CustomerFormValues } from "@/app/dashboard/customers/schema";
import { createCustomer, updateCustomer, type Customer } from "@/app/dashboard/customers/actions";
import { obtenerValorConDVSugerido } from "@/lib/dian-dv";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const isEdit = Boolean(customer?.id);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      tax_id: "",
      phone: "",
      address: "",
    },
  });

  React.useEffect(() => {
    if (open && customer) {
      form.reset({
        name: customer.name ?? "",
        tax_id: customer.tax_id ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
      });
    } else if (open && !customer) {
      form.reset({
        name: "",
        tax_id: "",
        phone: "",
        address: "",
      });
    }
  }, [open, customer, form]);

  async function onSubmit(values: CustomerFormValues) {
    const result = isEdit
      ? await updateCustomer(customer!.id, values)
      : await createCustomer(values);

    if (result.success) {
      toast.success(isEdit ? "Cliente actualizado correctamente" : "Cliente creado correctamente");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Error al guardar el cliente");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Modifique los datos del cliente." : "Complete los datos del cliente."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre completo o razón social"
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
              name="tax_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Identificación / NIT</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. 900123456 o cédula (DV se agrega al salir)"
                      {...field}
                      value={(field.value as string) ?? ""}
                      aria-invalid={fieldState.invalid}
                      onBlur={(e) => {
                        field.onBlur(e);
                        const conDV = obtenerValorConDVSugerido((field.value as string) ?? "");
                        if (conDV !== (field.value as string)) {
                          form.setValue("tax_id", conDV, { shouldValidate: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Número de contacto"
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
              name="address"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dirección (opcional)"
                      rows={3}
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
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando…" : isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
