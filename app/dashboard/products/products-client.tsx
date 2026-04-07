"use client";

import * as React from "react";
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
import { deleteProduct, type ProductWithRelations } from "./actions";
import type { ActiveSupplierOption, CategoryOption } from "./actions";

type StockFilter = "all" | "no_stock" | "with_stock";
const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "no_stock", label: "Sin Stock" },
  { value: "with_stock", label: "Con Stock" },
];

function StockBadge({ quantity }: { quantity: number }) {
  const variant =
    quantity === 0 ? "destructive" : quantity > 20 ? "secondary" : undefined;
  const className = cn(
    "px-2.5 py-0.5 tabular-nums",
    quantity > 0 &&
      quantity <= 20 &&
      "bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
  );
  return (
    <Badge variant={variant} className={className}>
      <div className="flex items-center gap-1.5 font-medium">
        <Package className="w-3 h-3 shrink-0" />
        <span>Stock: {quantity}</span>
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
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((row) =>
        row.name.toLowerCase().includes(q)
      );
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
      <div className="pt-8 px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Lista de Precios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Productos activos con proveedor y categoría.
            </p>
          </div>
          <Button
            onClick={openNewProductForm}
            className="w-fit shrink-0 h-10 gap-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20"
          >
            <Package className="size-4" />
            Nuevo Producto
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border mb-6">
          <div className="relative w-full min-w-0 flex-1 rounded-lg bg-background border-2 border-input shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <Input
              placeholder="Buscar por nombre, código o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-12 pr-4 text-base w-full rounded-lg border-0 bg-transparent focus-visible:ring-0"
              aria-label="Buscar por nombre, código o descripción"
            />
          </div>
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
          <div className="w-px h-8 bg-border shrink-0 hidden lg:block" aria-hidden />
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-border bg-card/80 shrink-0 shadow-sm">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase leading-none">
                Total Registrados
              </span>
              <span className="text-xl font-black text-foreground leading-tight tabular-nums">
                {totalProducts}
              </span>
            </div>
          </div>
        </div>

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
                className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40"
              >
                <header className="flex flex-row items-start justify-between gap-2 p-5 pb-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground leading-tight">
                    {product.name}
                  </h3>
                  <StockBadge quantity={product.stock_quantity ?? 0} />
                </header>
                <div className="flex flex-wrap gap-2 mt-3 mb-2 px-5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-xs font-medium text-foreground">
                    <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{product.presentation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-xs font-medium text-foreground">
                    <Boxes className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{product.packaging ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-xs font-medium text-foreground">
                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{product.supplier_name}</span>
                  </div>
                </div>
                <div className="mt-4 mx-5 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                <footer className="flex justify-end gap-2 mt-4 pt-3 border-t border-border px-5 pb-4 bg-muted/30">
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
