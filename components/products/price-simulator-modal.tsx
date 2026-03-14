"use client";

import * as React from "react";
import { Calculator, Percent, CircleDollarSign, TrendingUp, Box } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parsePackagingConversion } from "@/lib/parse-packaging";
import { motion } from "framer-motion";
import type { ProductWithRelations } from "@/app/dashboard/products/actions";

const PRESET_MARKUPS = [15, 20, 25] as const;

interface PriceSimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithRelations | null;
}

export function PriceSimulatorModal({
  open,
  onOpenChange,
  product,
}: PriceSimulatorModalProps) {
  const [markupPercentage, setMarkupPercentage] = React.useState(25);

  React.useEffect(() => {
    if (open && product) {
      setMarkupPercentage(25);
    }
  }, [open, product]);

  if (!product) return null;

  const cost = Number(product.cost) || 0;
  const calculatedPrice = cost * (1 + markupPercentage / 100);
  const expectedProfit = calculatedPrice - cost;

  const packagingParsed = parsePackagingConversion(product.packaging ?? null);
  const pricePerCaja =
    packagingParsed && packagingParsed.factor > 0 ? calculatedPrice * packagingParsed.factor : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-md w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton
      >
        <DialogTitle className="sr-only">Simulador de precios - {product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Calcule un precio de venta sugerido según el margen deseado.
        </DialogDescription>

        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col"
        >
          <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                <Calculator className="size-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-foreground truncate">
                  {product.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulador de precios. No modifica el producto.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <Label className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <CircleDollarSign className="size-3.5 text-primary" />
                Costo base
              </Label>
              <p className="mt-2 text-xl font-black tabular-nums text-foreground">
                {formatCop(cost)}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground flex items-center gap-2 text-sm mb-2">
                <Percent className="size-4 text-primary shrink-0" />
                Margen (%)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_MARKUPS.map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-lg h-9",
                      markupPercentage === pct && "bg-primary/15 text-primary ring-1 ring-primary/30 border-primary/30"
                    )}
                    onClick={() => setMarkupPercentage(pct)}
                  >
                    {pct}%
                  </Button>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    step={1}
                    value={markupPercentage}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) setMarkupPercentage(Math.max(0, Math.min(999, v)));
                    }}
                    className="h-9 w-16 rounded-lg text-center tabular-nums border-input focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/50 p-5 text-center min-h-[132px] flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
                <TrendingUp className="size-3.5" />
                Precio sugerido (unidad base)
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums text-primary">
                {formatCop(calculatedPrice)}
              </p>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                Utilidad proyectada: <span className="text-primary">{formatCop(expectedProfit)}</span>
              </p>
            </div>

            {pricePerCaja != null && packagingParsed && (
              <div className="rounded-xl border border-border bg-muted/30 p-5 text-center min-h-[132px] flex flex-col justify-center w-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
                  <Box className="size-3.5 text-primary" />
                  Por {packagingParsed.unitName}
                </p>
                <p className="mt-2 text-lg font-black tabular-nums text-foreground">
                  {formatCop(pricePerCaja)}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {packagingParsed.factor} un. × {formatCop(calculatedPrice)}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
