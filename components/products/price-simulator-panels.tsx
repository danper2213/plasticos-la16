"use client";

import * as React from "react";
import { Percent, CircleDollarSign, TrendingUp, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parsePackagingConversion } from "@/lib/parse-packaging";
import type { ProductWithRelations } from "@/app/dashboard/products/actions";

const PRESET_MARKUPS = [15, 20, 25] as const;

export interface PriceSimulatorPanelsProps {
  product: ProductWithRelations;
  className?: string;
}

export function PriceSimulatorPanels({ product, className }: PriceSimulatorPanelsProps) {
  const [markupPercentage, setMarkupPercentage] = React.useState(25);

  React.useEffect(() => {
    setMarkupPercentage(25);
  }, [product.id]);

  const cost = Number(product.cost) || 0;
  const calculatedPrice = cost * (1 + markupPercentage / 100);
  const expectedProfit = calculatedPrice - cost;

  const packagingParsed = parsePackagingConversion(product.packaging ?? null);
  const pricePerCaja =
    packagingParsed && packagingParsed.factor > 0 ? calculatedPrice * packagingParsed.factor : null;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <Label className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <CircleDollarSign className="size-3.5 text-primary" />
          Costo base
        </Label>
        <p className="mt-2 text-xl font-black tabular-nums text-foreground">{formatCop(cost)}</p>
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
                markupPercentage === pct &&
                  "bg-primary/15 text-primary ring-1 ring-primary/30 border-primary/30",
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
        <p className="mt-2 text-2xl font-black tabular-nums text-primary">{formatCop(calculatedPrice)}</p>
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
          <p className="mt-2 text-lg font-black tabular-nums text-foreground">{formatCop(pricePerCaja)}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {packagingParsed.factor} un. × {formatCop(calculatedPrice)}
          </p>
        </div>
      )}
    </div>
  );
}
