"use client";

import { Building2 } from "lucide-react";
import { HighlightedText } from "@/components/products/highlighted-text";
import { ProductInfoPanel } from "@/components/products/product-info-panel";
import { cn } from "@/lib/utils";

const SUPPLIER_AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
] as const;

function supplierPaletteIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % SUPPLIER_AVATAR_COLORS.length;
  }
  return hash;
}

function supplierInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

type SupplierHighlightProps = {
  supplierId: string;
  supplierName: string;
  searchQuery?: string;
  emphasized?: boolean;
  onSelect?: (supplierId: string) => void;
  className?: string;
};

export function SupplierHighlight({
  supplierId,
  supplierName,
  searchQuery = "",
  emphasized = false,
  onSelect,
  className,
}: SupplierHighlightProps) {
  const displayName = supplierName.trim() || "—";
  const avatarColor = SUPPLIER_AVATAR_COLORS[supplierPaletteIndex(supplierId || supplierName)];

  return (
    <ProductInfoPanel
      icon={Building2}
      label="Proveedor"
      emphasized={emphasized}
      onClick={onSelect && supplierId ? () => onSelect(supplierId) : undefined}
      ariaLabel={`Ver productos de ${displayName}`}
      title={`Filtrar por ${displayName}`}
      valueClassName="truncate text-base"
      className={cn(emphasized && "ring-2 ring-primary/25", className)}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-black",
            avatarColor,
          )}
          aria-hidden
        >
          {supplierInitial(displayName)}
        </span>
        <span className="truncate">
          <HighlightedText text={displayName} query={searchQuery} />
        </span>
      </span>
    </ProductInfoPanel>
  );
}
