"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  FileText,
  Truck,
  Hash,
  CircleDollarSign,
  CalendarCheck,
  CalendarClock,
  StickyNote,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { triggerSuccess } from "@/lib/confetti";
import { payableSchema, type PayableFormValues } from "@/app/dashboard/payables/schema";
import { createPayable, updatePayable } from "@/app/dashboard/payables/actions";
import type { ActiveSupplierOption, PayableWithSupplier } from "@/app/dashboard/payables/actions";
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

interface PayableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: ActiveSupplierOption[];
  onSuccess: () => void;
  /** Cuando está definido, el formulario edita esta factura en lugar de crear una nueva. */
  payable?: PayableWithSupplier | null;
}

export function PayableForm({ open, onOpenChange, suppliers, onSuccess, payable }: PayableFormProps) {
  const isEditing = Boolean(payable?.id);
  const form = useForm<PayableFormValues>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      supplier_id: "",
      invoice_number: "",
      invoice_amount: undefined as unknown as number,
      reception_date: "",
      due_date: "",
      payment_note: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      if (payable) {
        form.reset({
          supplier_id: payable.supplier_id,
          invoice_number: payable.invoice_number,
          invoice_amount: Number(payable.invoice_amount),
          reception_date: payable.reception_date?.slice(0, 10) ?? "",
          due_date: payable.due_date?.slice(0, 10) ?? "",
          payment_note: payable.payment_note ?? "",
        });
      } else {
        form.reset({
          supplier_id: "",
          invoice_number: "",
          invoice_amount: undefined as unknown as number,
          reception_date: new Date().toISOString().slice(0, 10),
          due_date: "",
          payment_note: "",
        });
      }
    }
  }, [open, payable, form]);

  async function onSubmit(values: PayableFormValues) {
    if (isEditing && payable?.id) {
      const result = await updatePayable(payable.id, values);
      if (result.success) {
        toast.success("Factura actualizada correctamente");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Error al actualizar la factura");
      }
    } else {
      const result = await createPayable(values);
      if (result.success) {
        triggerSuccess();
        toast.success("🎉 ¡Excelente! La factura fue registrada con éxito");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Hubo un error al procesar la solicitud");
      }
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
          {isEditing ? "Editar factura por pagar" : "Nueva factura por pagar"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEditing ? "Modifique los datos de la factura." : "Registre los datos de la factura recibida del proveedor."}
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={modalSpring}
          className="flex flex-col"
        >
          {/* Hero header — mismo patrón que modal de detalle */}
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <FileText className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  {isEditing ? "Editar factura por pagar" : "Nueva factura por pagar"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isEditing ? "Modifique los datos de la factura." : "Registre los datos de la factura recibida del proveedor."}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                <FormField
                  control={form.control}
                  name="supplier_id"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Truck className="size-4 text-primary shrink-0" aria-hidden />
                        Proveedor
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value != null ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger className={inputClassName}>
                            <SelectValue placeholder="Seleccione un proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
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
                  name="invoice_number"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Hash className="size-4 text-primary shrink-0" aria-hidden />
                        Número de factura
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. F-001-12345"
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
                  name="invoice_amount"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <CircleDollarSign className="size-4 text-primary shrink-0" aria-hidden />
                        Valor de la factura
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="reception_date"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <CalendarCheck className="size-4 text-primary shrink-0" aria-hidden />
                          Fecha de recepción
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
                    name="due_date"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <CalendarClock className="size-4 text-primary shrink-0" aria-hidden />
                          Fecha de vencimiento
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
                </div>
                <FormField
                  control={form.control}
                  name="payment_note"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <StickyNote className="size-4 text-primary shrink-0" aria-hidden />
                        Nota de pago (opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observaciones o referencia de pago"
                          rows={3}
                          className="rounded-lg border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none transition-colors"
                          value={(field.value as string) ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          aria-invalid={fieldState.invalid}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer — borde y acciones */}
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
                  {form.formState.isSubmitting ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar factura"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
