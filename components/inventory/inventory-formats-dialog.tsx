"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
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
import { searchProductsForMovement } from "@/app/dashboard/inventory/actions";
import type { ProductSearchHit } from "@/app/dashboard/inventory/actions";
import {
  deleteInventorySheetFormat,
  getInventorySheetFormat,
  listInventorySheetFormats,
  saveInventorySheetFormat,
  type InventorySheetFormatListItem,
} from "@/app/dashboard/inventory/sheet-actions";
import { cn } from "@/lib/utils";

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

type EditorProduct = {
  productId: string;
  name: string;
  presentation: string | null;
  packaging: string | null;
  supplierName: string | null;
};

function productSecondaryLine(p: {
  supplierName?: string | null;
  supplier_name?: string | null;
  presentation?: string | null;
  packaging?: string | null;
}): string {
  return [
    p.supplierName ?? p.supplier_name,
    p.presentation,
    p.packaging,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" · ");
}

type FormatsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InventoryFormatsDialog({ open, onOpenChange }: FormatsDialogProps) {
  const [list, setList] = React.useState<InventorySheetFormatListItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [defaultType, setDefaultType] = React.useState<"in" | "out" | "">("");
  const [products, setProducts] = React.useState<EditorProduct[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<ProductSearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showEditor = editingId !== null;

  const loadList = React.useCallback(async () => {
    setLoading(true);
    try {
      setList(await listInventorySheetFormats());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar los formatos");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      searchProductsForMovement(q).then((res) => {
        setSearchResults(res);
        setSearching(false);
      });
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  function resetEditor() {
    setEditingId(null);
    setName("");
    setDefaultType("");
    setProducts([]);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function openEditor(id?: string) {
    if (!id) {
      resetEditor();
      setEditingId("");
      return;
    }
    const detail = await getInventorySheetFormat(id);
    if (!detail) {
      toast.error("No se encontró el formato");
      return;
    }
    setEditingId(detail.id);
    setName(detail.name);
    setDefaultType(detail.defaultMovementType ?? "");
    setProducts(
      detail.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        presentation: l.presentation,
        packaging: l.packaging,
        supplierName: l.supplierName ?? null,
      })),
    );
  }

  function addProduct(p: ProductSearchHit) {
    if (products.some((x) => x.productId === p.id)) {
      toast.error("Ese producto ya está en el formato");
      return;
    }
    setProducts((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        presentation: p.presentation,
        packaging: p.packaging,
        supplierName: p.supplier_name,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  }

  function moveProduct(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= products.length) return;
    setProducts((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      if (!item) return prev;
      copy.splice(next, 0, item);
      return copy;
    });
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveInventorySheetFormat({
      id: editingId || undefined,
      name,
      defaultMovementType: defaultType === "" ? null : defaultType,
      productIds: products.map((p) => p.productId),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Formato guardado");
    resetEditor();
    await loadList();
  }

  async function handleDelete(id: string) {
    const result = await deleteInventorySheetFormat(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Formato eliminado");
    if (editingId === id) resetEditor();
    await loadList();
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetEditor();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden dark:bg-zinc-950/95 dark:border-zinc-800"
        showCloseButton
      >
        <DialogTitle className="sr-only">Formatos de inventario</DialogTitle>
        <DialogDescription className="sr-only">
          Armá una lista de productos, imprimila y anotá cantidades a mano.
        </DialogDescription>

        <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Formatos</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Lista a medida para imprimir y llenar a mano.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {showEditor ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input
                  className={inputClassName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Ruta mañana"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Tipo por defecto (opcional)</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "", label: "Sin marcar" },
                      { id: "in", label: "Entrada" },
                      { id: "out", label: "Salida" },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.id || "none"}
                      type="button"
                      size="sm"
                      variant={defaultType === opt.id ? "default" : "outline"}
                      className="h-9 rounded-lg text-xs"
                      onClick={() => setDefaultType(opt.id)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Productos</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className={cn(inputClassName, "pl-9")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar para agregar…"
                  />
                </div>
                {searchQuery.trim().length >= 2 ? (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-border">
                    {searching ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">Buscando…</p>
                    ) : searchResults.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>
                    ) : (
                      searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full border-b border-border/50 px-3 py-2 text-left last:border-0 hover:bg-muted/50"
                          onClick={() => addProduct(p)}
                        >
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {productSecondaryLine(p) || "Sin proveedor / empaque"}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}

                <ul className="space-y-1.5">
                  {products.map((p, index) => (
                    <li
                      key={p.productId}
                      className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 px-2 py-1.5"
                    >
                      <span className="w-5 text-center text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {productSecondaryLine(p) || "Sin proveedor / empaque"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => moveProduct(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => moveProduct(index, 1)}
                        disabled={index === products.length - 1}
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        onClick={() =>
                          setProducts((prev) => prev.filter((x) => x.productId !== p.productId))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : list.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay formatos. Creá uno con los productos de una ruta o mostrador.
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.code} · {item.lineCount} producto
                          {item.lineCount === 1 ? "" : "s"}
                          {item.defaultMovementType === "in"
                            ? " · Entrada"
                            : item.defaultMovementType === "out"
                              ? " · Salida"
                              : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg"
                        onClick={() => window.open(`/api/inventory/formats/${item.id}/pdf`, "_blank")}
                      >
                        <Printer className="size-3.5" />
                        Imprimir
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg"
                        onClick={() => void openEditor(item.id)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        onClick={() => void handleDelete(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border bg-muted/50 px-6 py-4 flex flex-wrap items-center justify-end gap-2 rounded-b-[24px]">
          {showEditor ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg gap-2"
                onClick={() => {
                  resetEditor();
                }}
              >
                <X className="size-4" />
                Volver
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg gap-2"
                  onClick={() => window.open(`/api/inventory/formats/${editingId}/pdf`, "_blank")}
                >
                  <Printer className="size-4" />
                  Imprimir
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-lg gap-2"
                disabled={saving || !name.trim() || products.length === 0}
                onClick={() => void handleSave()}
              >
                <Save className="size-4" />
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          ) : (
            <Button type="button" className="rounded-lg gap-2" onClick={() => void openEditor()}>
              <Plus className="size-4" />
              Nuevo formato
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
