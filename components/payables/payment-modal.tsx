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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentSchema, type PaymentFormValues } from "@/app/dashboard/payables/schema";
import { triggerSuccess } from "@/lib/confetti";
import { createPayment } from "@/app/dashboard/payables/actions";
import { getSupplierBankInfo } from "@/app/dashboard/proveedores/actions";
import { createClient } from "@/utils/supabase/client";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";
import type { BankAccountOption } from "@/app/dashboard/payables/actions";
import type { SupplierBankInfo } from "@/app/dashboard/proveedores/actions";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: PayableWithSupplier | null;
  bankAccounts: BankAccountOption[];
  onSuccess: () => void;
}

export function PaymentModal({
  open,
  onOpenChange,
  payable,
  bankAccounts,
  onSuccess,
}: PaymentModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [supplierBank, setSupplierBank] = React.useState<SupplierBankInfo | null>(null);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_paid: 0,
      source_of_funds: "",
      payment_date: new Date().toISOString().slice(0, 10),
      receipt_url: "",
    },
  });

  React.useEffect(() => {
    if (open && payable) {
      form.reset({
        amount_paid: payable.invoice_amount,
        source_of_funds: "",
        payment_date: new Date().toISOString().slice(0, 10),
        receipt_url: "",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      getSupplierBankInfo(payable.supplier_id).then(setSupplierBank);
    } else {
      setSupplierBank(null);
    }
  }, [open, payable, form]);

  const supplierAccountDisplay = React.useMemo(() => {
    if (!supplierBank) return null;
    const parts: string[] = [];
    if (supplierBank.bank_name) parts.push(supplierBank.bank_name);
    if (supplierBank.account_type) parts.push(supplierBank.account_type);
    const main = parts.length ? `${parts.join(" ")}: ${supplierBank.account_number ?? "—"}` : (supplierBank.account_number ?? "—");
    if (supplierBank.bank_agreement?.trim()) {
      return `${main} (Convenio: ${supplierBank.bank_agreement.trim()})`;
    }
    return main;
  }, [supplierBank]);

  async function onSubmit(values: PaymentFormValues) {
    if (!payable) return;

    let receipt_url = values.receipt_url ?? "";

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() ?? "";
        const path = `${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("comprobantes")
          .upload(path, file, { upsert: false });

        if (uploadError) {
          toast.error(uploadError.message ?? "Error al subir el comprobante");
          setIsUploading(false);
          return;
        }

        const { data } = supabase.storage.from("comprobantes").getPublicUrl(path);
        receipt_url = data.publicUrl;
      } catch (err) {
        toast.error("Error al subir el comprobante");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const result = await createPayment({ ...values, receipt_url: receipt_url || undefined }, payable.id);

    if (result.success) {
      triggerSuccess();
      toast.success("🎉 ¡Excelente! El pago fue registrado con éxito");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Hubo un error al procesar la solicitud");
    }
  }

  if (!payable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <span className="block">Factura {payable.invoice_number} · {payable.supplier_name}</span>
              {supplierAccountDisplay ? (
                <span className="block text-xs text-muted-foreground mt-1">
                  Pagar a: {supplierAccountDisplay}
                </span>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="amount_paid"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Monto a Pagar</FormLabel>
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
              name="source_of_funds"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Origen de Fondos</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value != null ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((bank) => (
                        <SelectItem key={bank.id} value={bank.name}>
                          {bank.name}
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
            <FormItem>
              <FormLabel>Comprobante de Pago (Opcional)</FormLabel>
              <FormControl>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="cursor-pointer file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                  aria-label="Comprobante de pago"
                />
              </FormControl>
            </FormItem>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isUploading}
              >
                {isUploading
                  ? "Subiendo comprobante..."
                  : form.formState.isSubmitting
                    ? "Guardando…"
                    : "Registrar pago"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
