"use client";

import * as React from "react";
import { Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import type { ProductWithRelations } from "@/app/dashboard/products/actions";
import { PriceSimulatorPanels } from "@/components/products/price-simulator-panels";

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
  if (!product) return null;

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

          <div className="p-6">
            <PriceSimulatorPanels key={`${product.id}-${open}`} product={product} />
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
