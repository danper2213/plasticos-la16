"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CircleDollarSign,
  Landmark,
  CalendarCheck,
  Paperclip,
  X,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { paymentSchema, type PaymentFormValues } from "@/app/dashboard/payables/schema";
import { triggerSuccess } from "@/lib/confetti";
import { createPayment } from "@/app/dashboard/payables/actions";
import { getSupplierBankInfo } from "@/app/dashboard/proveedores/actions";
import type { SupplierBankInfo } from "@/app/dashboard/proveedores/types";
import { createClient } from "@/utils/supabase/client";
import type { PayableWithSupplier } from "@/app/dashboard/payables/actions";
import type { BankAccountOption } from "@/app/dashboard/payables/actions";
import { formatCop } from "@/lib/format";
import { MONEY_EPS, roundMoney } from "@/lib/payable-balance";
import { motion } from "framer-motion";

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
  const [isUploading, setIsUploading] = React.useState(false);
  const [supplierBank, setSupplierBank] = React.useState<SupplierBankInfo | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const remaining = payable
    ? roundMoney(
        payable.balance_due ??
          Math.max(0, Number(payable.invoice_amount) - (payable.amount_paid_total ?? 0)),
      )
    : 0;
  const alreadyPaid = payable ? roundMoney(payable.amount_paid_total ?? 0) : 0;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_paid: 0,
      source_of_funds: "",
      payment_date: new Date().toISOString().slice(0, 10),
      receipt_url: "",
    },
  });

  const amountPaid = form.watch("amount_paid");
  const isPartialAbono =
    typeof amountPaid === "number" && amountPaid + MONEY_EPS < remaining;

  React.useEffect(() => {
    if (open && payable) {
      form.reset({
        amount_paid: remaining,
        source_of_funds: "",
        payment_date: new Date().toISOString().slice(0, 10),
        receipt_url: "",
      });
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      getSupplierBankInfo(payable.supplier_id).then(setSupplierBank);
    } else {
      setSupplierBank(null);
      setSelectedFile(null);
    }
  }, [open, payable, form, remaining]);

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

    const amount = roundMoney(values.amount_paid);
    if (amount > remaining + 0.01) {
      form.setError("amount_paid", {
        message: `El abono no puede superar el saldo (${formatCop(remaining)})`,
      });
      return;
    }

    let receipt_url = values.receipt_url ?? "";

    const file = selectedFile;
    if (file) {
      setIsUploading(true);
      try {
        const supabase = createClient();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${file.lastModified}-${file.size}-${safeName}`;

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
      } catch {
        toast.error("Error al subir el comprobante");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const result = await createPayment({ ...values, amount_paid: amount, receipt_url: receipt_url || undefined }, payable.id);

    if (result.success) {
      triggerSuccess();
      toast.success(
        result.fullyPaid
          ? "🎉 ¡Excelente! El pago fue registrado y la factura quedó pagada"
          : "Abono registrado. La factura queda con saldo pendiente",
      );
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Hubo un error al procesar la solicitud");
    }
  }

  if (!payable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        overlayClassName="bg-black/50 backdrop-blur-md"
      >
        <DialogTitle className="sr-only">Registrar pago o abono</DialogTitle>
        <DialogDescription className="sr-only">
          Factura {payable.invoice_number} de {payable.supplier_name}
        </DialogDescription>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={modalSpring}
        >
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <CreditCard className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Registrar pago
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Factura {payable.invoice_number} · {payable.supplier_name}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 p-3 text-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Factura
                    </p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums">
                      {formatCop(payable.invoice_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Abonado
                    </p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCop(alreadyPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Saldo
                    </p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                      {formatCop(remaining)}
                    </p>
                  </div>
                </div>

                {supplierAccountDisplay ? (
                  <p className="text-xs text-muted-foreground">
                    Pagar a: {supplierAccountDisplay}
                  </p>
                ) : null}

                <FormField
                  control={form.control}
                  name="amount_paid"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <CircleDollarSign className="size-4 text-primary shrink-0" aria-hidden />
                        Monto del abono o pago
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputClassName}
                          inputMode="decimal"
                          {...field}
                          value={formatAmountDisplay(field.value as number | undefined)}
                          onChange={(e) => field.onChange(parseAmountInput(e.target.value))}
                          aria-invalid={fieldState.invalid}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Podés abonar cualquier monto, hasta el saldo de {formatCop(remaining)}.
                      </p>
                      {typeof amountPaid === "number" &&
                      amountPaid > MONEY_EPS &&
                      amountPaid + MONEY_EPS < remaining ? (
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          Después de este abono queda un saldo de{" "}
                          {formatCop(roundMoney(remaining - amountPaid))}.
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg text-xs"
                          onClick={() => field.onChange(remaining)}
                        >
                          Pagar saldo
                        </Button>
                      </div>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source_of_funds"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <Landmark className="size-4 text-primary shrink-0" aria-hidden />
                        Origen de Fondos
                      </FormLabel>
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
                      <FormLabel className="text-muted-foreground flex items-center gap-2">
                        <CalendarCheck className="size-4 text-primary shrink-0" aria-hidden />
                        Fecha de Pago
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
                <FormItem>
                  <FormLabel className="text-muted-foreground flex items-center gap-2">
                    <Paperclip className="size-4 text-primary shrink-0" aria-hidden />
                    Comprobante de Pago (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      key={fileInputKey}
                      type="file"
                      accept="image/*,application/pdf"
                      className="cursor-pointer file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                      aria-label="Comprobante de pago"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </FormControl>
                </FormItem>
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
                  disabled={form.formState.isSubmitting || isUploading}
                  className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <CreditCard className="size-4" />
                  {isUploading
                    ? "Subiendo comprobante..."
                    : form.formState.isSubmitting
                      ? "Guardando…"
                      : isPartialAbono
                        ? "Registrar abono"
                        : "Registrar pago"}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
