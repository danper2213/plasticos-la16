"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { searchProductsForInvoiceMatch } from "@/app/dashboard/products/invoice-cost-actions";
import {
  defaultApplyCostUpdate,
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

export type ConfirmRowDraft = {
  key: string;
  descripcion: string;
  productId: string | null;
  productName: string | null;
  currentCost: number | null;
  unidadesPorEmpaque: number;
  unitCost: number;
  valorTotalConIva: number;
  valorTotalNeto: number;
  valorIva: number | null;
  um: string;
  cantidad: number;
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
      currentCost,
      unidadesPorEmpaque: row.cost.unidadesPorEmpaque,
      unitCost,
      valorTotalConIva: row.cost.valorTotalConIva,
      valorTotalNeto: row.line.valorTotalNeto,
      valorIva: row.line.valorIva ?? null,
      um: row.line.um,
      cantidad: row.line.cantidad,
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
}

export function InvoiceCostConfirmView({
  rows,
  onChange,
}: InvoiceCostConfirmViewProps) {
  const [searchByKey, setSearchByKey] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<
    Record<string, InvoiceMatchProduct[]>
  >({});
  const [searchingKey, setSearchingKey] = useState<string | null>(null);

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
          if (row.costBasis === "metraje") {
            // Factor = metros/rollo; total = rollos × metros (no cantidad en kg)
            const rolls = next.numeroRollos > 0 ? next.numeroRollos : 1;
            next.numeroRollos = rolls;
            next.totalUnidades = rolls * patch.unidadesPorEmpaque;
            next.unitLabel = "m";
          } else {
            next.totalUnidades = row.cantidad * patch.unidadesPorEmpaque;
          }
          next.unitCost = recomputeUnitCost(
            row.valorTotalConIva,
            next.totalUnidades,
          );
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
    const unitCost = rows.find((r) => r.key === key)?.unitCost ?? 0;
    updateRow(key, {
      productId: product.id,
      productName: product.name,
      currentCost: product.cost,
      checked: true,
      applyCostUpdate: defaultApplyCostUpdate(product.cost, unitCost),
      matchConfidence:
        rows.find((r) => r.key === key)?.matchConfidence === "learned"
          ? "learned"
          : "high",
    });
  }

  async function runSearch(key: string) {
    const q = (searchByKey[key] ?? "").trim();
    if (q.length < 2) return;
    setSearchingKey(key);
    try {
      const results = await searchProductsForInvoiceMatch(q);
      setSearchResults((prev) => ({ ...prev, [key]: results }));
    } finally {
      setSearchingKey(null);
    }
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
          {summary.learnOnly} solo aprender match
        </span>
        <span className="rounded-full border border-border px-2.5 py-1">
          {summary.selected} seleccionadas
        </span>
        <span className="rounded-full border border-border px-2.5 py-1">
          {summary.skipped} omitidas
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" title="Incluir línea para aprender el match">
                ✓
              </TableHead>
              <TableHead className="min-w-[220px]">Línea factura</TableHead>
              <TableHead className="min-w-[220px]">Producto</TableHead>
              <TableHead
                className="w-36"
                title="Metros por rollo y rollos (si aplica)"
              >
                Metraje
              </TableHead>
              <TableHead className="w-28 text-right">Costo BD</TableHead>
              <TableHead className="w-28 text-right">Costo factura</TableHead>
              <TableHead
                className="w-36 text-right"
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
                  { id: string; name: string; score?: number }
                >();
                for (const c of row.candidates) {
                  byId.set(c.product.id, {
                    id: c.product.id,
                    name: c.product.name,
                    score: c.score,
                  });
                }
                if (row.productId && row.productName && !byId.has(row.productId)) {
                  byId.set(row.productId, {
                    id: row.productId,
                    name: row.productName,
                  });
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
                      {row.costBasis === "metraje"
                        ? row.um.toUpperCase().startsWith("MT")
                          ? `${row.cantidad} ${row.um} (= metraje total)`
                          : `${row.numeroRollos} rollo(s) × ${row.unidadesPorEmpaque} m = ${row.totalUnidades.toLocaleString("es-CO")} m`
                        : `${row.cantidad} ${row.um} × ${row.unidadesPorEmpaque} un = ${row.totalUnidades.toLocaleString("es-CO")} un`}
                      <br />
                      neto {formatCost(row.valorTotalNeto)}
                      {row.valorIva != null
                        ? ` + IVA ${formatCost(row.valorIva)}`
                        : " × 1.19"}{" "}
                      = {formatCost(row.valorTotalConIva)}
                      <br />
                      {formatCost(row.valorTotalConIva)} ÷{" "}
                      {row.totalUnidades.toLocaleString("es-CO")} {row.unitLabel}{" "}
                      ={" "}
                      <span className="text-foreground font-semibold">
                        {formatCost(row.unitCost)}/{row.unitLabel}
                      </span>
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
                            const fromSearch = searchResults[row.key]?.find(
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
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.name}
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

                      <div className="flex gap-1.5">
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void runSearch(row.key);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 px-2"
                          disabled={searchingKey === row.key}
                          onClick={() => void runSearch(row.key)}
                        >
                          <Search className="size-3.5" />
                        </Button>
                      </div>

                      {(searchResults[row.key] ?? []).length > 0 ? (
                        <Select
                          onValueChange={(id) => {
                            const hit = searchResults[row.key]?.find(
                              (p) => p.id === id,
                            );
                            if (hit) selectProduct(row.key, hit);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Resultados de búsqueda…" />
                          </SelectTrigger>
                          <SelectContent>
                            {searchResults[row.key]!.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} · {formatCost(p.cost)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          aria-label="Metros por rollo"
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          m/rollo
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
                        {row.unidadesPorEmpaqueSource === "learning"
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
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {formatCost(row.unitCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
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
    </div>
  );
}
