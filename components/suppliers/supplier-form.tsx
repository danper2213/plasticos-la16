"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Truck,
  Building2,
  FileText,
  Landmark,
  CreditCard,
  Hash,
  FileDigit,
  Phone,
  X,
  Save,
  Globe,
  ImageIcon,
  ArrowUpDown,
  Monitor,
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
import { SearchCombobox } from "@/components/ui/search-combobox";
import { triggerSuccess } from "@/lib/confetti";
import { supplierSchema, type SupplierFormValues, ACCOUNT_TYPES } from "@/app/dashboard/proveedores/schema";
import { createSupplier, updateSupplier } from "@/app/dashboard/proveedores/actions";
import type { Supplier } from "@/app/dashboard/proveedores/types";
import { obtenerValorConDVSugerido } from "@/lib/dian-dv";
import { motion } from "framer-motion";

const modalSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSuccess: () => void;
}

export function SupplierForm({ open, onOpenChange, supplier, onSuccess }: SupplierFormProps) {
  const isEdit = Boolean(supplier?.id);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      tax_id: "",
      bank_name: "",
      account_type: undefined,
      account_number: "",
      bank_agreement: "",
      phone: "",
      show_on_website: false,
      logo_url: "",
      website_url: "",
      sort_order: 0,
    },
  });

  React.useEffect(() => {
    if (open && supplier) {
      form.reset({
        name: supplier.name ?? "",
        tax_id: supplier.tax_id ?? "",
        bank_name: supplier.bank_name ?? "",
        account_type: (supplier.account_type as "Ahorros" | "Corriente") ?? undefined,
        account_number: supplier.account_number ?? "",
        bank_agreement: supplier.bank_agreement ?? "",
        phone: supplier.phone ?? "",
        show_on_website: supplier.show_on_website ?? false,
        logo_url: supplier.logo_url ?? "",
        website_url: supplier.website_url ?? "",
        sort_order: supplier.sort_order ?? 0,
      });
    } else if (open && !supplier) {
      form.reset({
        name: "",
        tax_id: "",
        bank_name: "",
        account_type: undefined,
        account_number: "",
        bank_agreement: "",
        phone: "",
        show_on_website: false,
        logo_url: "",
        website_url: "",
        sort_order: 0,
      });
    }
  }, [open, supplier, form]);

  async function onSubmit(values: SupplierFormValues) {
    const result = isEdit
      ? await updateSupplier(supplier!.id, values)
      : await createSupplier(values);

    if (result.success) {
      triggerSuccess();
      toast.success(
        isEdit ? "Proveedor actualizado correctamente" : "🎉 ¡Excelente! El proveedor fue registrado con éxito"
      );
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Hubo un error al procesar la solicitud");
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
          {isEdit ? "Editar proveedor" : "Nuevo proveedor"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEdit ? "Modifique los datos del proveedor." : "Complete los datos del proveedor."}
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
                <Truck className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  {isEdit ? "Editar proveedor" : "Nuevo proveedor"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isEdit ? "Modifique los datos del proveedor." : "Complete los datos del proveedor y datos bancarios."}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Building2 className="size-4 text-primary shrink-0" aria-hidden />
                        Nombre del proveedor
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Acme S.A.S."
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
                  name="tax_id"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <FileText className="size-4 text-primary shrink-0" aria-hidden />
                        NIT
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. 900123456 (DV se agrega al salir)"
                          className={inputClassName}
                          {...field}
                          value={(field.value as string) ?? ""}
                          aria-invalid={fieldState.invalid}
                          onBlur={() => {
                            field.onBlur();
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
                  name="bank_name"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Landmark className="size-4 text-primary shrink-0" aria-hidden />
                        Banco
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Bancolombia"
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
                  name="account_type"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <CreditCard className="size-4 text-primary shrink-0" aria-hidden />
                        Tipo de cuenta
                      </FormLabel>
                      <FormControl>
                        <SearchCombobox
                          key={open ? "open" : "closed"}
                          options={ACCOUNT_TYPES.map((type) => ({ value: type, label: type }))}
                          value={field.value != null ? String(field.value) : ""}
                          onChange={field.onChange}
                          placeholder="Buscar tipo de cuenta..."
                          inputClassName={inputClassName}
                          emptyMessage="Ningún tipo coincide."
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Hash className="size-4 text-primary shrink-0" aria-hidden />
                        Número de cuenta
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. 12345678901"
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
                  name="bank_agreement"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <FileDigit className="size-4 text-primary shrink-0" aria-hidden />
                        Número de convenio (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. 12345"
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
                  name="phone"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Phone className="size-4 text-primary shrink-0" aria-hidden />
                        Teléfono (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. 300 123 4567"
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
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mostrar en Página Web
                  </p>
                  <FormField
                    control={form.control}
                    name="show_on_website"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Monitor className="size-4 text-primary shrink-0" aria-hidden />
                          Proveedor visible en landing
                        </FormLabel>
                        <FormControl>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="size-4 accent-blue-600"
                            />
                            <span className="text-sm text-foreground">
                              Mostrar en sección de aliados
                            </span>
                          </label>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="logo_url"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="size-4 text-primary shrink-0" aria-hidden />
                            URL logo (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://..."
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
                      name="website_url"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground flex items-center gap-2">
                            <Globe className="size-4 text-primary shrink-0" aria-hidden />
                            URL sitio (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://..."
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
                    name="sort_order"
                    render={({ field, fieldState }) => (
                      <FormItem className="mt-4 max-w-[180px]">
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <ArrowUpDown className="size-4 text-primary shrink-0" aria-hidden />
                          Orden en web
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className={inputClassName}
                            {...field}
                            value={(field.value as number | undefined) ?? 0}
                            onChange={(e) => {
                              const value = e.target.valueAsNumber;
                              field.onChange(Number.isNaN(value) ? 0 : value);
                            }}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
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
                  {form.formState.isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar proveedor"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
