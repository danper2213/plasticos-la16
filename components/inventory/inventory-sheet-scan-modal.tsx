"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  FileImage,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmInventorySheet,
  extractAndPreviewInventorySheet,
  listInventorySheetFormats,
  type InventorySheetExtractResult,
  type InventorySheetFormatListItem,
} from "@/app/dashboard/inventory/sheet-actions";
import type { SheetConfirmRow } from "@/lib/inventory-sheet/map-extracted-lines";
import { getStockDisplayInfo } from "@/lib/inventory-stock-display";
import { InvoiceCostProcessingOverlay } from "@/components/products/invoice-cost-processing-overlay";
import { triggerSuccess } from "@/lib/confetti";
import { cn } from "@/lib/utils";
import { searchProductsForMovement } from "@/app/dashboard/inventory/actions";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";
import { defaultQuantityUnit, getPackagingFactor } from "@/lib/inventory-quantity-unit";

type ScanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function InventorySheetScanModal({
  open,
  onOpenChange,
  onSuccess,
}: ScanModalProps) {
  const [step, setStep] = React.useState<"upload" | "confirm">("upload");
  const [formats, setFormats] = React.useState<InventorySheetFormatListItem[]>([]);
  const [formatId, setFormatId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<InventorySheetExtractResult | null>(null);
  const [rows, setRows] = React.useState<SheetConfirmRow[]>([]);
  const [movementType, setMovementType] = React.useState<"in" | "out" | "">("");
  const [notes, setNotes] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const busy = extracting || saving;

  React.useEffect(() => {
    if (!open) return;
    listInventorySheetFormats()
      .then(setFormats)
      .catch(() => setFormats([]));
  }, [open]);

  function reset() {
    setStep("upload");
    setFormatId("");
    setFile(null);
    setPreview(null);
    setRows([]);
    setMovementType("");
    setNotes("");
    setExtracting(false);
    setSaving(false);
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleExtract() {
    if (!file) {
      toast.error("Seleccioná una foto de la hoja");
      return;
    }
    setExtracting(true);
    const fd = new FormData();
    fd.set("file", file);
    if (formatId) fd.set("formatId", formatId);
    const result = await extractAndPreviewInventorySheet(fd);
    setExtracting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setPreview(result.data);
    setRows(result.data.rows);
    setMovementType(result.data.movementType ?? "");
    setNotes(result.data.notes ?? "");
    setStep("confirm");
  }

  function updateRow(key: string, patch: Partial<SheetConfirmRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleConfirm() {
    if (movementType !== "in" && movementType !== "out") {
      toast.error("Elegí si es Entrada o Salida");
      return;
    }
    const lines = rows
      .filter((r) => r.include && r.productId && r.quantity > 0)
      .map((r) => ({
        product_id: r.productId as string,
        quantity: r.quantity,
        quantity_unit: r.quantityUnit,
        historical_unit_cost: r.cost,
      }));
    if (lines.length === 0) {
      toast.error("Marcá al menos un producto con cantidad");
      return;
    }
    setSaving(true);
    const result = await confirmInventorySheet({
      movementType,
      notes,
      lines,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "No se pudo registrar");
      return;
    }
    triggerSuccess();
    toast.success(
      `Registradas ${result.count} ${movementType === "in" ? "entradas" : "salidas"}`,
    );
    reset();
    onOpenChange(false);
    onSuccess();
  }

  const isPdf = file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton={!busy}
      >
        <DialogTitle className="sr-only">Leer hoja de inventario</DialogTitle>
        <DialogDescription className="sr-only">
          Subí la foto de una lista manuscrita o de la hoja impresa y confirmá las cantidades.
        </DialogDescription>

        <div className="relative">
          {extracting ? (
            <InvoiceCostProcessingOverlay mode="extract-sheet" />
          ) : null}

          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Camera className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Leer foto</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step === "upload"
                    ? "Lista a mano o hoja FMT impresa."
                    : "Revisá productos y registrá entrada o salida."}
                </p>
              </div>
            </div>
          </div>

          {step === "upload" ? (
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {formats.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Formato impreso (opcional). Dejalo vacío si es una lista a mano.
                  </p>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={formatId}
                    onChange={(e) => setFormatId(e.target.value)}
                  >
                    <option value="">Sin formato / lista a mano</option>
                    {formats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const next = e.dataTransfer.files?.[0];
                  if (next) setFile(next);
                }}
                className={cn(
                  "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-8 text-center",
                  dragOver
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-muted/20 hover:border-primary/40",
                )}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Upload className="size-6" />
                </div>
                <p className="text-sm font-semibold">Arrastrá o elegí la foto / PDF</p>
                <p className="text-xs text-muted-foreground">
                  Lista manuscrita o hoja FMT · JPG, PNG, WEBP o PDF · máx. 15 MB
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (next) setFile(next);
                    e.target.value = "";
                  }}
                />
              </div>

              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    {isPdf ? <FileText className="size-4" /> : <FileImage className="size-4" />}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</p>
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setFile(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <ConfirmStep
              preview={preview}
              rows={rows}
              movementType={movementType}
              notes={notes}
              onMovementType={setMovementType}
              onNotes={setNotes}
              onRowChange={updateRow}
            />
          )}

          <div className="border-t border-border bg-muted/50 px-6 py-4 flex flex-wrap items-center justify-end gap-2 rounded-b-[24px]">
            {step === "confirm" ? (
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => setStep("upload")}>
                Volver
              </Button>
            ) : (
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
            )}
            {step === "upload" ? (
              <Button type="button" className="rounded-lg" disabled={!file || busy} onClick={() => void handleExtract()}>
                Leer lista
              </Button>
            ) : (
              <Button type="button" className="rounded-lg" disabled={busy} onClick={() => void handleConfirm()}>
                Registrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmStep({
  preview,
  rows,
  movementType,
  notes,
  onMovementType,
  onNotes,
  onRowChange,
}: {
  preview: InventorySheetExtractResult | null;
  rows: SheetConfirmRow[];
  movementType: "in" | "out" | "";
  notes: string;
  onMovementType: (v: "in" | "out") => void;
  onNotes: (v: string) => void;
  onRowChange: (key: string, patch: Partial<SheetConfirmRow>) => void;
}) {
  return (
    <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
      {preview?.formatName ? (
        <p className="text-xs text-muted-foreground">
          Formato {preview.formatCode}: {preview.formatName}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Lista manuscrita{preview?.sheetDate ? ` · ${preview.sheetDate}` : ""}
          {preview?.movementType === "in"
            ? " · detectamos Entrada"
            : preview?.movementType === "out"
              ? " · detectamos Salida"
              : ""}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant={movementType === "in" ? "default" : "outline"}
          className={cn("h-9 rounded-lg gap-2", movementType === "in" && "bg-emerald-600 hover:bg-emerald-600/90")}
          onClick={() => onMovementType("in")}
        >
          <ArrowDownLeft className="size-4" />
          Entrada
        </Button>
        <Button
          type="button"
          variant={movementType === "out" ? "default" : "outline"}
          className={cn("h-9 rounded-lg gap-2", movementType === "out" && "bg-red-600 hover:bg-red-600/90")}
          onClick={() => onMovementType("out")}
        >
          <ArrowUpRight className="size-4" />
          Salida
        </Button>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <ConfirmRowCard
            key={row.key}
            row={row}
            showExtra={Boolean(preview?.formatName)}
            onChange={(patch) => onRowChange(row.key, patch)}
          />
        ))}
      </ul>

      <Textarea
        className="rounded-lg min-h-[72px]"
        placeholder="Observaciones del lote (opcional)"
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
      />
    </div>
  );
}

function ConfirmRowCard({
  row,
  showExtra,
  onChange,
}: {
  row: SheetConfirmRow;
  showExtra: boolean;
  onChange: (patch: Partial<SheetConfirmRow>) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<ProductSearchHit[]>([]);
  const factor = getPackagingFactor(row.packaging);
  const stockLabel = getStockDisplayInfo(
    row.stockQuantity,
    row.packaging,
    row.presentation,
  ).primary;

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      searchProductsForMovement(q).then(setHits);
    }, 280);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <li className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={row.include}
          onChange={(e) => onChange({ include: e.target.checked })}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{row.productName ?? row.descripcion}</p>
          <p className="text-[11px] text-muted-foreground">
            {row.productName && row.descripcion && row.productName !== row.descripcion
              ? `En la foto: ${row.descripcion} · `
              : ""}
            Fila {row.rowIndex}
            {showExtra && row.extra ? " · extra" : ""}
            {row.skipped && row.skipReason ? ` · ${row.skipReason}` : ""}
            {row.productName ? ` · ${stockLabel}` : " · sin producto"}
          </p>
        </div>
        <Input
          type="number"
          min={0}
          step="any"
          className="h-9 w-20 rounded-lg text-center font-semibold"
          value={row.quantity === 0 ? "" : String(row.quantity)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(",", "."));
            const qty = Number.isFinite(n) ? Math.max(0, n) : 0;
            onChange({
              quantity: qty,
              include: qty > 0 && Boolean(row.productId),
              skipped: qty <= 0,
            });
          }}
        />
      </div>
      {factor != null && factor > 1 ? (
        <div className="flex gap-1.5 pl-6">
          <Button
            type="button"
            size="sm"
            variant={row.quantityUnit === "pack" ? "default" : "outline"}
            className="h-7 rounded-md text-[11px]"
            onClick={() => onChange({ quantityUnit: "pack" })}
          >
            Paca
          </Button>
          <Button
            type="button"
            size="sm"
            variant={row.quantityUnit === "unit" ? "default" : "outline"}
            className="h-7 rounded-md text-[11px]"
            onClick={() => onChange({ quantityUnit: "unit" })}
          >
            Unidad
          </Button>
        </div>
      ) : null}
      {!row.productId || row.matchConfidence === "low" || row.matchConfidence === "none" ? (
        <div className="space-y-1">
          <Input
            className="h-9 rounded-lg text-sm"
            placeholder="Buscar producto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {hits.length > 0 ? (
            <div className="max-h-28 overflow-y-auto rounded-lg border">
              {hits.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  onClick={() => {
                    onChange({
                      productId: p.id,
                      productName: p.name,
                      presentation: p.presentation,
                      packaging: p.packaging,
                      cost: p.cost,
                      stockQuantity: p.stock_quantity,
                      quantityUnit: defaultQuantityUnit(p.packaging),
                      matchConfidence: "high",
                      include: row.quantity > 0,
                    });
                    setQuery("");
                    setHits([]);
                  }}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.supplier_name, p.presentation, p.packaging]
                      .filter(Boolean)
                      .join(" · ") || "Sin proveedor / empaque"}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
