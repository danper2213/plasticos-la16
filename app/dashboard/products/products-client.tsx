"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  Calculator,
  Calendar,
  Layers,
  Package,
  Pencil,
  Search,
  Trash2,
  QrCode,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTimeEsCO } from "@/lib/calendar-date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductForm } from "@/components/products/product-form";
import { PriceSimulatorModal } from "@/components/products/price-simulator-modal";
import { toast } from "sonner";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";
import { sortProductsBySearchRelevance } from "@/lib/product-search";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import {
  DashboardToolbar,
  DashboardToolbarSearchShell,
  DashboardToolbarStat,
} from "@/components/layout/dashboard-toolbar";
import { deleteProduct, type ProductWithRelations } from "./actions";
import type { ActiveSupplierOption, CategoryOption } from "./actions";

type StockFilter = "all" | "no_stock" | "with_stock";
const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "no_stock", label: "Sin Stock" },
  { value: "with_stock", label: "Con Stock" },
];

function StockBadge({ quantity }: { quantity: number }) {
  const isZero = quantity === 0;
  const isLow = quantity > 0 && quantity <= 20;
  const isPlenty = quantity > 20;

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 px-2.5 py-0.5 tabular-nums border font-medium shadow-none",
        isZero &&
          "border-border/70 bg-muted/35 text-muted-foreground dark:border-zinc-700/70 dark:bg-zinc-900/65 dark:text-zinc-400",
        isLow &&
          "border-amber-500/25 bg-amber-500/[0.08] text-amber-800 dark:border-amber-500/22 dark:bg-amber-500/[0.07] dark:text-amber-400/95",
        isPlenty &&
          "border-border/60 bg-muted/45 text-foreground/90 dark:border-zinc-700/55 dark:bg-zinc-800/55 dark:text-zinc-200",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Package className="w-3 h-3 shrink-0 opacity-80" />
        <span>
          {isZero ? "Sin stock" : `Stock: ${formatInventoryQuantity(quantity)}`}
        </span>
      </div>
    </Badge>
  );
}

interface ProductsClientProps {
  products: ProductWithRelations[];
  suppliers: ActiveSupplierOption[];
  categories: CategoryOption[];
}

export function ProductsClient({
  products,
  suppliers,
  categories,
}: ProductsClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductWithRelations | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [productForSimulator, setProductForSimulator] = useState<ProductWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const uniqueCategoryNames = useMemo(() => {
    const names = new Set(products.map((p) => p.category_name).filter(Boolean));
    return Array.from(names).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (stockFilter === "no_stock") {
      result = result.filter((row) => (row.stock_quantity ?? 0) === 0);
    } else if (stockFilter === "with_stock") {
      result = result.filter((row) => (row.stock_quantity ?? 0) > 0);
    }

    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter((row) => row.category_name === categoryFilter);
    }

    if (searchQuery.trim()) {
      result = sortProductsBySearchRelevance(result, searchQuery);
    }

    return result;
  }, [products, stockFilter, categoryFilter, searchQuery]);

  function handleFormSuccess() {
    router.refresh();
  }

  function openSimulator(product: ProductWithRelations) {
    setProductForSimulator(product);
    setSimulatorOpen(true);
  }

  function openNewProductForm() {
    setProductToEdit(null);
    setFormOpen(true);
  }

  function openEditProductForm(product: ProductWithRelations) {
    setProductToEdit(product);
    setFormOpen(true);
  }

  function openDeleteDialog(product: ProductWithRelations) {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    setIsDeleting(true);
    const result = await deleteProduct(productToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setProductToDelete(null);
    if (result.success) {
      toast.success("Producto eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el producto");
    }
  }

  const totalProducts = products.length;

  return (
    <>
      <div className="space-y-6">
        <DashboardPageHeader
          icon={Layers}
          title="Lista de Precios"
          description="Productos activos con proveedor y categoría."
          actions={
            <Button
              onClick={openNewProductForm}
              className="h-11 gap-2 rounded-xl border-0 bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/25"
            >
              <Package className="size-4" />
              Nuevo Producto
            </Button>
          }
        />

        <DashboardToolbar className="flex flex-col items-center gap-4 lg:flex-row">
          <DashboardToolbarSearchShell>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-primary/90" />
            <Input
              placeholder="Buscar por palabras: plato hondo, 12 oz, código…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border-0 bg-transparent pl-11 pr-4 text-base focus-visible:ring-0"
              aria-label="Buscar por nombre, presentación o código de escaneo"
            />
          </DashboardToolbarSearchShell>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-full rounded-lg border-input bg-background md:w-[200px] focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {uniqueCategoryNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {STOCK_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={stockFilter === value ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-lg h-9",
                    stockFilter === value && "bg-primary/15 text-primary ring-1 ring-primary/30"
                  )}
                  onClick={() => setStockFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="hidden h-8 w-px shrink-0 bg-border lg:block" aria-hidden />
          <DashboardToolbarStat>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary dark:bg-primary/15">
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-muted-foreground">
                Total Registrados
              </span>
              <span className="text-xl font-black tabular-nums leading-tight text-foreground">
                {totalProducts}
              </span>
            </div>
          </DashboardToolbarStat>
        </DashboardToolbar>

        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground shadow-sm">
            {products.length === 0
              ? "No hay productos registrados. Haga clic en \"Nuevo Producto\" para agregar uno."
              : "Ningún resultado coincide con los filtros."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md hover:shadow-slate-900/5 dark:hover:shadow-primary/10"
              >
                <header className="flex flex-row items-start justify-between gap-2 p-5 pb-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground leading-tight">
                    {product.name}
                  </h3>
                  <StockBadge quantity={product.stock_quantity ?? 0} />
                </header>
                <div className="mb-2 mt-3 flex flex-wrap gap-2 px-5">
                  <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-muted/60">
                    <Package className="size-3.5 shrink-0 text-primary" />
                    <span>{product.presentation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-muted/60">
                    <Boxes className="size-3.5 shrink-0 text-primary" />
                    <span>{product.packaging ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-muted/60">
                    <Building2 className="size-3.5 shrink-0 text-primary" />
                    <span>{product.supplier_name}</span>
                  </div>
                  {product.scan_code ? (
                    <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-100/90 px-2.5 py-1.5 font-mono text-xs text-foreground dark:bg-muted/60">
                      <QrCode className="size-3.5 shrink-0 text-primary" aria-hidden />
                      <span>{product.scan_code}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-slate-50/90 p-4 dark:bg-muted/30">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Costo Base
                  </span>
                  <span className="text-xl font-black tabular-nums text-primary">
                    {formatCop(product.cost)}
                  </span>
                </div>
                <div className="mt-3 space-y-0.5 px-5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      Última actualización:{" "}
                      {formatDateTimeEsCO(
                        product.updated_at ?? product.created_at ?? null,
                      )}
                    </span>
                  </div>
                  {product.created_at &&
                  product.updated_at &&
                  product.updated_at !== product.created_at ? (
                    <p className="pl-5 text-[0.7rem] opacity-80">
                      Registro inicial: {formatDateTimeEsCO(product.created_at)}
                    </p>
                  ) : null}
                </div>
                <footer className="mt-4 flex justify-end gap-2 border-t border-border/70 bg-slate-50/50 px-5 pb-4 pt-3 dark:bg-muted/30">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Editar producto"
                    onClick={() => openEditProductForm(product)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Simular precio"
                    onClick={() => openSimulator(product)}
                  >
                    <Calculator className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Etiqueta QR para imprimir"
                    asChild
                  >
                    <Link href={`/dashboard/products/etiqueta?id=${encodeURIComponent(product.id)}`}>
                      <QrCode className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Eliminar producto"
                    onClick={() => openDeleteDialog(product)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </footer>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setProductToEdit(null);
        }}
        suppliers={suppliers}
        categories={categories}
        onSuccess={handleFormSuccess}
        initialData={productToEdit}
      />

      <PriceSimulatorModal
        open={simulatorOpen}
        onOpenChange={setSimulatorOpen}
        product={productForSimulator}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar &quot;{productToDelete?.name}&quot;? El producto dejará de
              mostrarse en la lista. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
