"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { searchIntelligent, toSearchProduct } from "@/lib/searchEngine";
import {
  costFromCatalogUnitPrice,
  defaultApplyCostUpdate,
  extractCatalogPackUnits,
  invoiceCostDelta,
  type InvoiceMatchProduct,
  type ProcessedInvoiceLine,
} from "@/lib/invoice-cost";
import { cn } from "@/lib/utils";

function formatCost(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const stickyCostHead =
  "sticky right-[10.5rem] z-30 w-[8.5rem] bg-zinc-100 text-right shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.45)] dark:bg-zinc-900";
const stickyDiffHead =
  "sticky right-0 z-30 w-[10.5rem] bg-zinc-100 text-right dark:bg-zinc-900";
const stickyCostCell =
  "sticky right-[10.5rem] z-10 w-[8.5rem] bg-card text-right tabular-nums shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.45)]";
const stickyDiffCell =
  "sticky right-0 z-10 w-[10.5rem] bg-card text-right tabular-nums";

function productOptionLabel(
  name: string,
  supplierName?: string | null,
  extra?: string | null,
): string {
  return [name, supplierName?.trim() || null, extra ?? null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export type ConfirmRowDraft = {
  key: string;
  descripcion: string;
  productId: string | null;
  productName: string | null;
  productSupplierName: string | null;
  currentCost: number | null;
  unidadesPorEmpaque: number;
  unitCost: number;
  valorTotalConIva: number;
  valorTotalNeto: number;
  valorIva: number | null;
  ivaInclusion: ProcessedInvoiceLine["cost"]["ivaInclusion"];
  um: string;
  cantidad: number;
  precioUnitario: number | null;
  pricedFromUnitPrice: boolean;
  totalUnidades: number;
  numeroRollos: number;
  costBasis: ProcessedInvoiceLine["cost"]["costBasis"];
  unitLabel: ProcessedInvoiceLine["cost"]["unitLabel"];
  checked: boolean;
  /** Aplicar el costo de factura al producto (alza o baja). */
  applyCostUpdate: boolean;
  matchConfidence: ProcessedInvoiceLine["matchConfidence"];
  action: ProcessedInvoiceLine["action"];
  candidates: ProcessedInvoiceLine["candidates"];
  unidadesPorEmpaqueSource: ProcessedInvoiceLine["cost"]["unidadesPorEmpaqueSource"];
  packaging: string | null;
  /** Entrada al inventario en caja madre (paca, caja), no en unidades internas. */
  receiveInventory: boolean;
  inventoryQuantity: number;
};

export function buildConfirmRowDrafts(
  processed: ProcessedInvoiceLine[],
): ConfirmRowDraft[] {
  return processed.map((row, index) => {
    const product = row.suggestedProduct;
    const unitCost = row.cost.costoUnitario;
    const currentCost = product?.cost ?? null;
    // Se puede aprender el match aunque el costo no cambie.
    const canLearn = product != null;
    const applyCostUpdate = defaultApplyCostUpdate(currentCost, unitCost);

    return {
      key: `${index}-${row.line.descripcion.slice(0, 40)}`,
      descripcion: row.line.descripcion,
      productId: product?.id ?? null,
      productName: product?.name ?? null,
      productSupplierName: product?.supplier_name ?? null,
      currentCost,
      unidadesPorEmpaque: row.cost.unidadesPorEmpaque,
      unitCost,
      valorTotalConIva: row.cost.valorTotalConIva,
      valorTotalNeto: row.line.valorTotalNeto,
      valorIva: row.line.valorIva ?? null,
      ivaInclusion: row.cost.ivaInclusion,
      um: row.line.um,
      cantidad: row.line.cantidad,
      precioUnitario: row.line.precioUnitario ?? null,
      pricedFromUnitPrice: row.cost.pricedFromUnitPrice,
      totalUnidades: row.cost.totalUnidades,
      numeroRollos: row.cost.numeroRollos ?? 1,
      costBasis: row.cost.costBasis,
      unitLabel: row.cost.unitLabel,
      applyCostUpdate,
      checked:
        (row.action === "propose_update" && applyCostUpdate) ||
        (canLearn &&
          (row.action === "skip_not_higher" ||
            row.matchConfidence === "learned" ||
            row.matchConfidence === "high" ||
            row.matchConfidence === "medium")),
      matchConfidence: row.matchConfidence,
      action: row.action,
      candidates: row.candidates,
      unidadesPorEmpaqueSource: row.cost.unidadesPorEmpaqueSource,
      packaging: product?.packaging ?? null,
      receiveInventory:
        product != null &&
        row.cost.costBasis !== "metraje" &&
        row.line.cantidad > 0,
      inventoryQuantity: row.line.cantidad,
    };
  });
}

function recomputeUnitCost(
  valorTotalConIva: number,
  totalUnidades: number,
): number {
  if (totalUnidades <= 0) return 0;
  return Math.round((valorTotalConIva / totalUnidades) * 100) / 100;
}

function confidenceBadge(confidence: ConfirmRowDraft["matchConfidence"]) {
  switch (confidence) {
    case "learned":
      return <Badge variant="success">Aprendido</Badge>;
    case "high":
      return <Badge variant="success">Alta</Badge>;
    case "medium":
      return <Badge variant="warning">Media</Badge>;
    case "low":
      return <Badge variant="outline">Baja</Badge>;
    default:
      return <Badge variant="destructive">Sin match</Badge>;
  }
}

interface InvoiceCostConfirmViewProps {
  rows: ConfirmRowDraft[];
  onChange: (rows: ConfirmRowDraft[]) => void;
  catalog?: InvoiceMatchProduct[];
}

function searchInvoiceMatchCatalog(
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

export function InvoiceCostConfirmView({
  rows,
  onChange,
  catalog = [],
}: InvoiceCostConfirmViewProps) {
  const [searchByKey, setSearchByKey] = useState<Record<string, string>>({});

  const searchResultsByKey = useMemo(() => {
    const next: Record<string, InvoiceMatchProduct[]> = {};
    for (const [key, query] of Object.entries(searchByKey)) {
      next[key] = searchInvoiceMatchCatalog(catalog, query);
    }
    return next;
  }, [catalog, searchByKey]);

  const summary = useMemo(() => {
    const selected = rows.filter((r) => r.checked && r.productId);
    const costUpdates = selected.filter((r) => {
      if (!r.applyCostUpdate || r.currentCost == null) return false;
      const delta = invoiceCostDelta(r.currentCost, r.unitCost);
      return delta === "increase" || delta === "decrease";
    });
    const increases = costUpdates.filter(
      (r) => invoiceCostDelta(r.currentCost, r.unitCost) === "increase",
    );
    const decreases = costUpdates.filter(
      (r) => invoiceCostDelta(r.currentCost, r.unitCost) === "decrease",
    );
    const pendingDecreases = rows.filter(
      (r) =>
        r.productId != null &&
        r.unitCost > 0 &&
        invoiceCostDelta(r.currentCost, r.unitCost) === "decrease" &&
        !r.applyCostUpdate,
    );
    return {
      selected: selected.length,
      increases: increases.length,
      decreases: decreases.length,
      pendingDecreases: pendingDecreases.length,
      learnOnly: selected.length - costUpdates.length,
      skipped: rows.filter((r) => !r.checked).length,
    };
  }, [rows]);

  function updateRow(key: string, patch: Partial<ConfirmRowDraft>) {
    onChange(
      rows.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };

        if (
          patch.unidadesPorEmpaque != null &&
          patch.unidadesPorEmpaque !== row.unidadesPorEmpaque
        ) {
          if (next.pricedFromUnitPrice && next.precioUnitario) {
            const priced = costFromCatalogUnitPrice(
              next.precioUnitario,
              patch.unidadesPorEmpaque,
            );
            next.totalUnidades = patch.unidadesPorEmpaque;
            next.valorTotalConIva = priced.valorConIva;
            next.unitCost = priced.costoUnitario;
            next.unitLabel = "un";
            next.costBasis = "unidad";
          } else if (row.costBasis === "metraje") {
            // Factor = metros/rollo; total = rollos × metros (no cantidad en kg)
            const rolls = next.numeroRollos > 0 ? next.numeroRollos : 1;
            next.numeroRollos = rolls;
            next.totalUnidades = rolls * patch.unidadesPorEmpaque;
            next.unitLabel = "m";
            next.unitCost = recomputeUnitCost(
              row.valorTotalConIva,
              next.totalUnidades,
            );
          } else {
            next.totalUnidades = row.cantidad * patch.unidadesPorEmpaque;
            next.unitCost = recomputeUnitCost(
              row.valorTotalConIva,
              next.totalUnidades,
            );
          }
        }

        if (
          patch.numeroRollos != null &&
          patch.numeroRollos !== row.numeroRollos &&
          row.costBasis === "metraje"
        ) {
          next.totalUnidades = patch.numeroRollos * next.unidadesPorEmpaque;
          next.unitCost = recomputeUnitCost(
            row.valorTotalConIva,
            next.totalUnidades,
          );
        }

        const costInputsChanged =
          patch.unidadesPorEmpaque != null ||
          patch.numeroRollos != null ||
          patch.productId != null ||
          patch.currentCost != null;

        if (patch.applyCostUpdate === undefined && costInputsChanged) {
          const prevDelta = invoiceCostDelta(row.currentCost, row.unitCost);
          const nextDelta = invoiceCostDelta(next.currentCost, next.unitCost);
          if (nextDelta === "decrease" && prevDelta === "decrease") {
            // Conservar la decisión de bajar costo si sigue siendo menor.
          } else {
            next.applyCostUpdate = defaultApplyCostUpdate(
              next.currentCost,
              next.unitCost,
            );
          }
        }

        // Sin producto no se puede aprender ni actualizar.
        if (!next.productId) {
          next.checked = false;
          next.applyCostUpdate = false;
          next.receiveInventory = false;
        } else if (patch.productId != null) {
          // Al elegir/corregir match, marcar para aprender (y actualizar si aplica).
          next.checked = true;
        } else if (patch.applyCostUpdate === true) {
          next.checked = true;
        }

        return next;
      }),
    );
  }

  function selectProduct(key: string, product: InvoiceMatchProduct) {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const catalogUnits =
      row.costBasis === "metraje"
        ? null
        : extractCatalogPackUnits(product.packaging);
    const priced =
      catalogUnits != null && row.precioUnitario != null && row.precioUnitario > 0
        ? costFromCatalogUnitPrice(row.precioUnitario, catalogUnits)
        : null;
    const unitCost = priced?.costoUnitario ?? row.unitCost;
    updateRow(key, {
      productId: product.id,
      productName: product.name,
      productSupplierName: product.supplier_name ?? null,
      currentCost: product.cost,
      checked: true,
      applyCostUpdate: defaultApplyCostUpdate(product.cost, unitCost),
      matchConfidence: row.matchConfidence === "learned" ? "learned" : "high",
      packaging: product.packaging ?? null,
      receiveInventory: row.costBasis !== "metraje" && row.cantidad > 0,
      ...(priced && catalogUnits != null
        ? {
            unidadesPorEmpaque: catalogUnits,
            totalUnidades: catalogUnits,
            unitCost: priced.costoUnitario,
            valorTotalConIva: priced.valorConIva,
            pricedFromUnitPrice: true,
            unidadesPorEmpaqueSource: "catalog" as const,
            unitLabel: "un" as const,
            costBasis: "unidad" as const,
          }
        : {}),
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No hay líneas para revisar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2.5 py-1">
          {summary.increases} a subir costo
        </span>
        <span className="rounded-full border border-border px-2.5 py-1">
          {summary.decreases} a bajar costo
        </span>
        {summary.pendingDecreases > 0 ? (
          <button
            type="button"
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
            onClick={() =>
              onChange(
                rows.map((r) =>
                  invoiceCostDelta(r.currentCost, r.unitCost) === "decrease" &&
                  r.unitCost > 0 &&
                  r.productId
                    ? { ...r, applyCostUpdate: true, checked: true }
                    : r,
                ),
              )
            }
          >
            {summary.pendingDecreases} con costo menor · aplicar todas
          </button>
        ) : null}
        <span className="rounded-full border border-border px-2.5 py-1">
          {summary.selected} seleccionadas
        </span>
        <span className="rounded-full border border-border px-2.5 py-1">
          {summary.skipped} omitidas
        </span>
      </div>

      <Table
        containerClassName="max-h-[min(48vh,34rem)] border-border shadow-none"
        className="min-w-[1080px]"
      >
          <TableHeader className="sticky top-0 z-20">
            <TableRow>
              <TableHead className="w-10 bg-zinc-100 dark:bg-zinc-900" title="Incluir línea para aprender el match">
                ✓
              </TableHead>
              <TableHead className="min-w-[200px] bg-zinc-100 dark:bg-zinc-900">Línea factura</TableHead>
              <TableHead className="min-w-[200px] bg-zinc-100 dark:bg-zinc-900">Producto</TableHead>
              <TableHead
                className="w-36 bg-zinc-100 dark:bg-zinc-900"
                title="Metros por rollo y rollos (si aplica)"
              >
                Metraje
              </TableHead>
              <TableHead className="w-28 bg-zinc-100 dark:bg-zinc-900 text-right">Costo BD</TableHead>
              <TableHead className={stickyCostHead}>
                Costo factura
              </TableHead>
              <TableHead
                className={stickyDiffHead}
                title="Diferencia vs catálogo. Marcá para aplicar el costo de factura (incluye bajas)."
              >
                Diff / aplicar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const canLearn = row.productId != null;
              const delta = invoiceCostDelta(row.currentCost, row.unitCost);
              const canApplyCost =
                canLearn && (delta === "increase" || delta === "decrease");
              const diff =
                row.currentCost != null ? row.unitCost - row.currentCost : null;

              const costBadge = (() => {
                if (row.applyCostUpdate && delta === "increase") {
                  return <Badge variant="success">Sube costo</Badge>;
                }
                if (row.applyCostUpdate && delta === "decrease") {
                  return <Badge variant="warning">Baja costo</Badge>;
                }
                if (delta === "decrease") {
                  return <Badge variant="warning">Costo menor</Badge>;
                }
                if (canLearn) {
                  return <Badge variant="outline">Solo aprender</Badge>;
                }
                return null;
              })();

              const selectOptions = (() => {
                const byId = new Map<
                  string,
                  {
                    id: string;
                    name: string;
                    supplierName?: string | null;
                    score?: number;
                  }
                >();
                for (const c of row.candidates) {
                  byId.set(c.product.id, {
                    id: c.product.id,
                    name: c.product.name,
                    supplierName: c.product.supplier_name,
                    score: c.score,
                  });
                }
                if (row.productId && row.productName) {
                  const existing = byId.get(row.productId);
                  if (existing) {
                    if (!existing.supplierName && row.productSupplierName) {
                      existing.supplierName = row.productSupplierName;
                    }
                  } else {
                    byId.set(row.productId, {
                      id: row.productId,
                      name: row.productName,
                      supplierName: row.productSupplierName,
                    });
                  }
                }
                return [...byId.values()];
              })();

              return (
                <TableRow
                  key={row.key}
                  className={cn(
                    row.checked && "bg-primary/5",
                    delta === "decrease" &&
                      !row.applyCostUpdate &&
                      "bg-amber-500/5",
                    row.action === "no_match" && "bg-destructive/5",
                  )}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={row.checked}
                      disabled={!canLearn}
                      onChange={(e) =>
                        updateRow(row.key, { checked: e.target.checked })
                      }
                      aria-label={`Aprender match ${row.descripcion}`}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium leading-snug line-clamp-3">
                      {row.descripcion}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {confidenceBadge(row.matchConfidence)}
                      {row.costBasis === "metraje" ? (
                        <Badge variant="success">Por metraje</Badge>
                      ) : (
                        <Badge variant="outline">Por unidad</Badge>
                      )}
                      {costBadge}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground font-mono tabular-nums">
                      {row.pricedFromUnitPrice && row.precioUnitario ? (
                        <>
                          Precio unit. {formatCost(row.precioUnitario)} × 1,19 ={" "}
                          {formatCost(row.valorTotalConIva)}
                          <br />
                          {formatCost(row.valorTotalConIva)} ÷{" "}
                          {row.unidadesPorEmpaque.toLocaleString("es-CO")} un
                          (catálogo) ={" "}
                          <span className="text-foreground font-semibold">
                            {formatCost(row.unitCost)}/un
                          </span>
                        </>
                      ) : (
                        <>
                          {row.costBasis === "metraje"
                            ? row.um.toUpperCase().startsWith("MT")
                              ? `${row.cantidad} ${row.um} (= metraje total)`
                              : `${row.numeroRollos} rollo(s) × ${row.unidadesPorEmpaque} m = ${row.totalUnidades.toLocaleString("es-CO")} m`
                            : `${row.cantidad} ${row.um} × ${row.unidadesPorEmpaque} un = ${row.totalUnidades.toLocaleString("es-CO")} un`}
                          <br />
                          VR TOTAL {formatCost(row.valorTotalNeto)}
                          {row.ivaInclusion === "excluded"
                            ? row.valorIva != null
                              ? ` + IVA ${formatCost(row.valorIva)} = ${formatCost(row.valorTotalConIva)}`
                              : ` × 1,19 = ${formatCost(row.valorTotalConIva)}`
                            : row.valorIva != null
                              ? ` · IVA ${formatCost(row.valorIva)} (incluido)`
                              : " (IVA incluido)"}
                          <br />
                          {formatCost(row.valorTotalConIva)} ÷{" "}
                          {row.totalUnidades.toLocaleString("es-CO")}{" "}
                          {row.unitLabel} ={" "}
                          <span className="text-foreground font-semibold">
                            {formatCost(row.unitCost)}/{row.unitLabel}
                          </span>
                        </>
                      )}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {selectOptions.length > 0 ? (
                        <Select
                          value={row.productId ?? undefined}
                          onValueChange={(id) => {
                            const fromCandidates = row.candidates.find(
                              (c) => c.product.id === id,
                            )?.product;
                            const fromSearch = searchResultsByKey[row.key]?.find(
                              (p) => p.id === id,
                            );
                            const hit = fromCandidates ?? fromSearch;
                            if (hit) {
                              selectProduct(row.key, hit);
                              return;
                            }
                            const opt = selectOptions.find((o) => o.id === id);
                            if (opt) {
                              updateRow(row.key, {
                                productId: opt.id,
                                productName: opt.name,
                                productSupplierName: opt.supplierName ?? null,
                                checked: true,
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Elegir producto…" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectOptions.map((opt) => (
                              <SelectItem
                                key={opt.id}
                                value={opt.id}
                                className="whitespace-normal"
                              >
                                {productOptionLabel(opt.name, opt.supplierName)}
                                {opt.score != null ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    ({Math.round(opt.score * 100)}%)
                                  </span>
                                ) : null}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Sin coincidencia. Buscá abajo.
                        </p>
                      )}

                      <Input
                        value={searchByKey[row.key] ?? ""}
                        onChange={(e) =>
                          setSearchByKey((prev) => ({
                            ...prev,
                            [row.key]: e.target.value,
                          }))
                        }
                        placeholder="Buscar otro producto…"
                        className="h-8 text-xs"
                      />

                      {(searchResultsByKey[row.key] ?? []).length > 0 ? (
                        <Select
                          onValueChange={(id) => {
                            const hit = searchResultsByKey[row.key]?.find(
                              (p) => p.id === id,
                            );
                            if (hit) selectProduct(row.key, hit);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Resultados de búsqueda…" />
                          </SelectTrigger>
                          <SelectContent>
                            {searchResultsByKey[row.key]!.map((p) => (
                              <SelectItem
                                key={p.id}
                                value={p.id}
                                className="whitespace-normal"
                              >
                                {productOptionLabel(
                                  p.name,
                                  p.supplier_name,
                                  formatCost(p.cost),
                                )}
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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          step="any"
                          className="h-9 w-20"
                          value={row.unidadesPorEmpaque}
                          onChange={(e) => {
                            const n = Number.parseFloat(e.target.value);
                            if (!Number.isFinite(n) || n <= 0) return;
                            updateRow(row.key, { unidadesPorEmpaque: n });
                          }}
                          aria-label={
                            row.costBasis === "metraje"
                              ? "Metros por rollo"
                              : "Unidades por empaque"
                          }
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {row.costBasis === "metraje" ? "m/rollo" : "un/empaque"}
                        </span>
                      </div>
                      {row.costBasis === "metraje" &&
                      !row.um.toUpperCase().startsWith("MT") ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="h-8 w-20"
                            value={row.numeroRollos}
                            onChange={(e) => {
                              const n = Number.parseInt(e.target.value, 10);
                              if (!Number.isFinite(n) || n <= 0) return;
                              updateRow(row.key, { numeroRollos: n });
                            }}
                            aria-label="Número de rollos"
                          />
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            rollos
                          </span>
                        </div>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground">
                        {row.unidadesPorEmpaqueSource === "catalog"
                          ? "empaque del catálogo"
                          : row.unidadesPorEmpaqueSource === "learning"
                          ? "aprendido"
                          : row.unidadesPorEmpaqueSource === "metraje"
                            ? "desde descripción"
                            : row.unidadesPorEmpaqueSource === "regex"
                              ? "regex"
                              : "fallback"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {row.currentCost != null ? formatCost(row.currentCost) : "—"}
                  </TableCell>
                  <TableCell className={cn(stickyCostCell, "text-sm font-medium")}>
                    {formatCost(row.unitCost)}
                  </TableCell>
                  <TableCell className={cn(stickyDiffCell, "text-sm")}>
                    {diff == null ? (
                      "—"
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            delta === "increase" &&
                              "text-amber-700 dark:text-amber-400",
                            delta === "decrease" &&
                              "text-emerald-700 dark:text-emerald-400",
                            delta === "same" && "text-muted-foreground",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatCost(diff)}
                        </span>
                        {canApplyCost ? (
                          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-sans cursor-pointer">
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border-input"
                              checked={row.applyCostUpdate}
                              onChange={(e) =>
                                updateRow(row.key, {
                                  applyCostUpdate: e.target.checked,
                                })
                              }
                              aria-label={
                                delta === "decrease"
                                  ? `Bajar costo de ${row.descripcion}`
                                  : `Actualizar costo de ${row.descripcion}`
                              }
                            />
                            {delta === "decrease"
                              ? "Bajar costo"
                              : "Actualizar"}
                          </label>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
    </div>
  );
}
