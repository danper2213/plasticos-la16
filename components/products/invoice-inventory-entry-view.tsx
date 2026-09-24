"use client";

import { useMemo, useState } from "react";
import { pluralMotherBoxLabel } from "@/lib/inventory-quantity-unit";
import { searchIntelligent, toSearchProduct } from "@/lib/searchEngine";
import type { InvoiceMatchProduct } from "@/lib/invoice-cost";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConfirmRowDraft } from "@/components/products/invoice-cost-confirm-view";

export function inventoryEntryCandidates(
  rows: ConfirmRowDraft[],
): ConfirmRowDraft[] {
  return rows.filter((row) => row.costBasis !== "metraje");
}

function searchInventoryCatalog(
  catalog: InvoiceMatchProduct[],
  query: string,
): InvoiceMatchProduct[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const ranked = searchIntelligent(
    trimmed,
    catalog.map((product) =>
      toSearchProduct({
        id: product.id,
        name: product.name,
        category_name: product.supplier_name,
        presentation: product.presentation,
        packaging: product.packaging,
        cost: product.cost,
      }),
    ),
  );
  const byId = new Map(catalog.map((product) => [product.id, product]));
  return ranked
    .slice(0, 20)
    .map((row) => byId.get(row.id))
    .filter((product): product is InvoiceMatchProduct => product != null);
}

interface InvoiceInventoryEntryViewProps {
  rows: ConfirmRowDraft[];
  onChange: (rows: ConfirmRowDraft[]) => void;
  catalog?: InvoiceMatchProduct[];
}

export function InvoiceInventoryEntryView({
  rows,
  onChange,
  catalog = [],
}: InvoiceInventoryEntryViewProps) {
  const [searchByKey, setSearchByKey] = useState<Record<string, string>>({});
  const candidates = inventoryEntryCandidates(rows);
  const metrajeCount = rows.filter((row) => row.costBasis === "metraje").length;
  const searchResultsByKey = useMemo(() => {
    const next: Record<string, InvoiceMatchProduct[]> = {};
    for (const [key, query] of Object.entries(searchByKey)) {
      next[key] = searchInventoryCatalog(catalog, query);
    }
    return next;
  }, [catalog, searchByKey]);

  function updateRow(key: string, patch: Partial<ConfirmRowDraft>) {
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function selectProduct(key: string, product: InvoiceMatchProduct) {
    updateRow(key, {
      productId: product.id,
      productName: product.name,
      productSupplierName: product.supplier_name ?? null,
      packaging: product.packaging ?? null,
      currentCost: product.cost,
      receiveInventory: true,
    });
    setSearchByKey((prev) => ({ ...prev, [key]: "" }));
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No hay productos para entrar por caja madre.
        {metrajeCount > 0
          ? " El metraje no se ingresa por paca o caja."
          : ""}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        La cantidad es de caja madre (pacas, cajas o bultos), la misma unidad
        de la factura. Si el producto no coincide, buscalo de nuevo: el
        proveedor aparece debajo del nombre. En cero, o sin marcar, esa línea
        no ingresa.
      </p>
      {metrajeCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {metrajeCount}{" "}
          {metrajeCount === 1 ? "línea de metraje queda" : "líneas de metraje quedan"}{" "}
          fuera de esta entrada.
        </p>
      ) : null}
      <Table containerClassName="max-h-[min(48vh,34rem)] border-border shadow-none">
        <TableHeader className="sticky top-0 z-20">
          <TableRow>
            <TableHead className="w-10 bg-zinc-100 dark:bg-zinc-900">✓</TableHead>
            <TableHead className="min-w-[220px] bg-zinc-100 dark:bg-zinc-900">
              Producto
            </TableHead>
            <TableHead className="min-w-[220px] bg-zinc-100 dark:bg-zinc-900">
              Línea factura
            </TableHead>
            <TableHead className="w-40 bg-zinc-100 dark:bg-zinc-900 text-right">
              En la factura
            </TableHead>
            <TableHead className="w-52 bg-zinc-100 dark:bg-zinc-900 text-right">
              Entrada
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((row) => {
            const unit = pluralMotherBoxLabel(row.inventoryQuantity, row.um);
            const invoiceUnit = pluralMotherBoxLabel(row.cantidad, row.um);
            return (
              <TableRow key={row.key}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={row.receiveInventory && row.productId != null}
                    disabled={row.productId == null}
                    onChange={(e) =>
                      updateRow(row.key, { receiveInventory: e.target.checked })
                    }
                    aria-label={`Ingresar ${row.productName ?? row.descripcion}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium leading-snug">
                        {row.productName ?? "Sin producto"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {row.productSupplierName?.trim() || "Sin proveedor"}
                        {row.packaging ? ` · ${row.packaging}` : ""}
                      </p>
                    </div>
                    <Input
                      value={searchByKey[row.key] ?? ""}
                      onChange={(e) =>
                        setSearchByKey((prev) => ({
                          ...prev,
                          [row.key]: e.target.value,
                        }))
                      }
                      placeholder="Buscar producto o proveedor…"
                      className="h-8 text-xs"
                    />
                    {(searchResultsByKey[row.key] ?? []).length > 0 ? (
                      <Select
                        onValueChange={(id) => {
                          const hit = searchResultsByKey[row.key]?.find(
                            (product) => product.id === id,
                          );
                          if (hit) selectProduct(row.key, hit);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Resultados de búsqueda…" />
                        </SelectTrigger>
                        <SelectContent>
                          {searchResultsByKey[row.key]!.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                              className="whitespace-normal"
                            >
                              {product.name}
                              {product.supplier_name?.trim()
                                ? ` · ${product.supplier_name.trim()}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (searchByKey[row.key] ?? "").trim() ? (
                      <p className="text-[11px] text-muted-foreground">
                        Sin resultados
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm leading-snug line-clamp-3">
                    {row.descripcion}
                  </p>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {row.cantidad.toLocaleString("es-CO")} {invoiceUnit}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="h-9 w-24 text-right"
                      value={row.inventoryQuantity}
                      disabled={!row.receiveInventory || row.productId == null}
                      onChange={(e) => {
                        const n = Number.parseFloat(e.target.value);
                        if (!Number.isFinite(n) || n < 0) return;
                        updateRow(row.key, { inventoryQuantity: n });
                      }}
                      aria-label={`Cajas madre de ${row.productName ?? row.descripcion}`}
                    />
                    <span className="w-16 text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
