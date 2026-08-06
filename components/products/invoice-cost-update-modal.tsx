"use client";

import { useState } from "react";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  confirmInvoiceCostUpdates,
  extractAndPreviewInvoiceCosts,
  prepareInvoicePayableDraft,
  registerInvoicePayable,
  type InvoiceExtractMeta,
  type InvoicePayableDraft,
} from "@/app/dashboard/products/invoice-cost-actions";
import type { ActiveSupplierOption } from "@/app/dashboard/products/actions";
import {
  InvoiceCostConfirmView,
  buildConfirmRowDrafts,
  type ConfirmRowDraft,
} from "@/components/products/invoice-cost-confirm-view";
import { InvoiceCostProcessingOverlay } from "@/components/products/invoice-cost-processing-overlay";
import { InvoiceCostUploadStep } from "@/components/products/invoice-cost-upload-step";
import { InvoicePayableConfirmView } from "@/components/products/invoice-payable-confirm-view";

type Step = "upload" | "confirm" | "payable";

interface InvoiceCostUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: ActiveSupplierOption[];
  onSuccess?: () => void;
}

export function InvoiceCostUpdateModal({
  open,
  onOpenChange,
  suppliers,
  onSuccess,
}: InvoiceCostUpdateModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmRows, setConfirmRows] = useState<ConfirmRowDraft[]>([]);
  const [extractMeta, setExtractMeta] = useState<InvoiceExtractMeta | null>(
    null,
  );
  const [payableDraft, setPayableDraft] = useState<InvoicePayableDraft | null>(
    null,
  );
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [costResultSummary, setCostResultSummary] = useState<string | null>(
    null,
  );

  const busy = extracting || confirming || registering;

  function resetState() {
    setStep("upload");
    setSupplierId("");
    setFile(null);
    setConfirmRows([]);
    setExtractMeta(null);
    setPayableDraft(null);
    setExtracting(false);
    setConfirming(false);
    setRegistering(false);
    setCostResultSummary(null);
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    if (!next) resetState();
    onOpenChange(next);
  }

  async function loadPayableDraft(): Promise<boolean> {
    if (!extractMeta) {
      toast.error("No hay datos de factura para registrar");
      return false;
    }

    try {
      const draft = await prepareInvoicePayableDraft({
        supplierId: supplierId || null,
        meta: {
          supplierName: extractMeta.supplierName,
          invoiceNumber: extractMeta.invoiceNumber,
          invoiceDate: extractMeta.invoiceDate,
          invoiceTotalConIva: extractMeta.invoiceTotalConIva,
          invoiceTotalNeto: extractMeta.invoiceTotalNeto,
          lineNetosSum: extractMeta.lineNetosSum,
        },
      });
      setPayableDraft(draft);
      setStep("payable");
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo preparar el registro en CxP",
      );
      return false;
    }
  }

  async function handleExtract() {
    if (!file) {
      toast.error("Subí el PDF o la foto de la factura");
      return;
    }

    setExtracting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (supplierId) formData.set("supplierId", supplierId);

      const result = await extractAndPreviewInvoiceCosts(formData);
      setConfirmRows(buildConfirmRowDrafts(result.processed));
      setExtractMeta(result.meta);
      setStep("confirm");
      toast.success(
        `Se extrajeron ${result.meta.lineCount} línea${result.meta.lineCount === 1 ? "" : "s"} de la factura`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo extraer la factura",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleConfirmCosts() {
    const selected = confirmRows.filter((r) => r.checked && r.productId);
    if (selected.length === 0) {
      toast.error("Seleccioná al menos una línea, o continuá solo a CxP");
      return;
    }

    setConfirming(true);
    try {
      const result = await confirmInvoiceCostUpdates({
        supplierId: supplierId || null,
        lines: selected.map((r) => ({
          descripcion: r.descripcion,
          productId: r.productId!,
          unidadesPorEmpaque: Math.round(r.unidadesPorEmpaque),
          unitCost: r.unitCost,
          costBasis: r.costBasis,
          applyCostUpdate:
            r.currentCost != null && r.unitCost > r.currentCost,
        })),
      });

      const learnOnly = result.learningsUpserted - result.updatedCosts;
      const summary =
        result.updatedCosts > 0
          ? `Actualizados ${result.updatedCosts} costo${result.updatedCosts === 1 ? "" : "s"} · ${result.learningsUpserted} aprendizaje${result.learningsUpserted === 1 ? "" : "s"}`
          : `Aprendizaje guardado (${result.learningsUpserted} match${result.learningsUpserted === 1 ? "" : "es"})${learnOnly > 0 ? " · sin cambio de costo" : ""}`;

      setCostResultSummary(summary);
      toast.success(summary);
      await loadPayableDraft();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudieron confirmar los costos",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function handleSkipCostsToPayable() {
    setCostResultSummary(null);
    setConfirming(true);
    try {
      await loadPayableDraft();
    } finally {
      setConfirming(false);
    }
  }

  async function handleRegisterPayable() {
    if (!payableDraft) return;

    if (!payableDraft.supplierId) {
      toast.error("Seleccioná el proveedor");
      return;
    }
    if (!payableDraft.invoiceNumber.trim()) {
      toast.error("Indicá el número de factura");
      return;
    }
    if (!(payableDraft.invoiceAmount > 0)) {
      toast.error("Indicá el valor de la factura");
      return;
    }
    if (!payableDraft.receptionDate) {
      toast.error("Indicá la fecha de recepción");
      return;
    }
    if (!payableDraft.dueDate) {
      toast.error("Indicá el día del calendario (listado)");
      return;
    }

    setRegistering(true);
    try {
      const result = await registerInvoicePayable({
        supplier_id: payableDraft.supplierId,
        invoice_number: payableDraft.invoiceNumber.trim(),
        invoice_amount: payableDraft.invoiceAmount,
        reception_date: payableDraft.receptionDate,
        due_date: payableDraft.dueDate,
        payment_note: payableDraft.paymentNote.trim() || "",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Factura registrada en CxP · ${payableDraft.suggestedDueDateLabel}`,
      );
      resetState();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo registrar en cuentas por pagar",
      );
    } finally {
      setRegistering(false);
    }
  }

  function finishWithoutPayable() {
    resetState();
    onOpenChange(false);
    onSuccess?.();
  }

  const selectedCount = confirmRows.filter(
    (r) => r.checked && r.productId,
  ).length;

  const stepSubtitle =
    step === "upload"
      ? "Paso 1 · Subí el PDF o la foto para extraer con IA"
      : step === "confirm"
        ? "Paso 2 · Confirmá matches y costos"
        : "Paso 3 · Verificá datos y registrá en cuentas por pagar";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-5xl w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={!busy}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">
          Actualizar costos desde factura
        </DialogTitle>
        <DialogDescription className="sr-only">
          Extraé líneas, confirmá costos y registrá la factura en cuentas por
          pagar.
        </DialogDescription>

        <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
              <FileSpreadsheet className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Actualizar costos desde factura
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stepSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
            {step === "upload" ? (
              <InvoiceCostUploadStep
                suppliers={suppliers}
                supplierId={supplierId}
                onSupplierIdChange={setSupplierId}
                file={file}
                onFileChange={setFile}
              />
            ) : null}

            {step === "confirm" ? (
              <div className="space-y-4">
                {extractMeta ? (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2.5 py-1">
                      {extractMeta.fileName}
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1">
                      {extractMeta.lineCount} líneas extraídas
                    </span>
                    {extractMeta.invoiceNumber ? (
                      <span className="rounded-full border border-border px-2.5 py-1">
                        Factura {extractMeta.invoiceNumber}
                      </span>
                    ) : null}
                    {extractMeta.supplierName ? (
                      <span className="rounded-full border border-border px-2.5 py-1">
                        {extractMeta.supplierName}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <InvoiceCostConfirmView
                  rows={confirmRows}
                  onChange={setConfirmRows}
                />
              </div>
            ) : null}

            {step === "payable" && payableDraft ? (
              <div className="space-y-4">
                {costResultSummary ? (
                  <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
                    {costResultSummary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
                    Continuaste sin cambios de costo. Revisá la cabecera y
                    registrá en CxP.
                  </p>
                )}
                <InvoicePayableConfirmView
                  draft={payableDraft}
                  suppliers={suppliers}
                  onChange={setPayableDraft}
                />
              </div>
            ) : null}
          </div>

          {extracting ? <InvoiceCostProcessingOverlay mode="extract" /> : null}
          {confirming ? <InvoiceCostProcessingOverlay mode="confirm" /> : null}
          {registering ? <InvoiceCostProcessingOverlay mode="confirm" /> : null}
        </div>

        <div className="border-t border-border bg-muted/50 px-6 py-4 flex flex-wrap items-center justify-between gap-2 rounded-b-[24px]">
          {step === "confirm" ? (
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 rounded-lg"
              disabled={busy}
              onClick={() => setStep("upload")}
            >
              <ArrowLeft className="size-4" />
              Otra factura
            </Button>
          ) : step === "payable" ? (
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 rounded-lg"
              disabled={busy}
              onClick={() => setStep("confirm")}
            >
              <ArrowLeft className="size-4" />
              Volver a precios
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground max-w-sm">
              La IA lee la factura. Después de precios podés registrar en
              cuentas por pagar.
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {step === "payable" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={finishWithoutPayable}
                >
                  Omitir CxP
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRegisterPayable()}
                  className="rounded-lg gap-2"
                >
                  {registering ? "Registrando…" : "Registrar en CxP"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                {step === "upload" ? (
                  <Button
                    type="button"
                    disabled={busy || !file}
                    onClick={() => void handleExtract()}
                    className="rounded-lg gap-2"
                  >
                    {extracting ? "Procesando…" : "Extraer y revisar"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-lg"
                      disabled={busy}
                      onClick={() => void handleSkipCostsToPayable()}
                    >
                      Solo CxP
                    </Button>
                    <Button
                      type="button"
                      disabled={busy || selectedCount === 0}
                      onClick={() => void handleConfirmCosts()}
                      className="rounded-lg gap-2"
                    >
                      {confirming
                        ? "Procesando…"
                        : `Confirmar y continuar (${selectedCount})`}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
