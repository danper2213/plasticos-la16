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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  movementSchema,
  type MovementFormValues,
  MOVEMENT_TYPES,
  type MovementType,
} from "@/app/dashboard/inventory/schema";
import { createMovement } from "@/app/dashboard/inventory/actions";
import type { ActiveProductOption } from "@/app/dashboard/inventory/actions";

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ActiveProductOption[];
  onSuccess: () => void;
}

export function MovementForm({
  open,
  onOpenChange,
  products,
  onSuccess,
}: MovementFormProps) {
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: "",
      movement_type: "in",
      quantity: 1,
      historical_unit_cost: 0,
      notes: "",
    },
  });

  const selectedProductId = form.watch("product_id");

  React.useEffect(() => {
    if (open) {
      form.reset({
        product_id: "",
        movement_type: "in",
        quantity: 1,
        historical_unit_cost: 0,
        notes: "",
      });
    }
  }, [open, form]);

  React.useEffect(() => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (product != null) {
      form.setValue("historical_unit_cost", product.cost);
    }
  }, [selectedProductId, products, form]);

  async function onSubmit(values: MovementFormValues) {
    const result = await createMovement(values);

    if (result.success) {
      toast.success("Movimiento registrado correctamente");
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
            Registre una entrada, salida o ajuste de inventario.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value != null ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimiento</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value != null ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOVEMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {MOVEMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
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
              name="historical_unit_cost"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Costo Unitario</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
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
              name="notes"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. Factura 123, Mercancía dañada"
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
                {form.formState.isSubmitting ? "Guardando…" : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
