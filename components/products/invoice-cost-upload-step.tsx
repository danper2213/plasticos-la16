"use client";

import { useRef, useState } from "react";
import { FileImage, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActiveSupplierOption } from "@/app/dashboard/products/actions";
import { cn } from "@/lib/utils";

interface InvoiceCostUploadStepProps {
  suppliers: ActiveSupplierOption[];
  supplierId: string;
  onSupplierIdChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function InvoiceCostUploadStep({
  suppliers,
  supplierId,
  onSupplierIdChange,
  file,
  onFileChange,
}: InvoiceCostUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function acceptFile(next: File | null | undefined) {
    if (!next) return;
    onFileChange(next);
  }

  const isPdf = file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="invoice-supplier">Proveedor (recomendado)</Label>
        <Select
          value={supplierId || "none"}
          onValueChange={(v) => onSupplierIdChange(v === "none" ? "" : v)}
        >
          <SelectTrigger id="invoice-supplier" className="max-w-md">
            <SelectValue placeholder="Seleccionar proveedor…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin proveedor</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          El aprendizaje se guarda por proveedor: cada factura confirmada mejora
          la extracción y el match de la siguiente.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Factura (PDF o foto)</Label>
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
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Upload className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Arrastrá o elegí el PDF / foto de la factura
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG o WEBP · máx. 15 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => {
              acceptFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {isPdf ? (
                <FileText className="size-4" aria-hidden />
              ) : (
                <FileImage className="size-4" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
