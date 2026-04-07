"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Package,
  Box,
  Layers,
  CircleDollarSign,
  Truck,
  Tag,
  Plus,
  X,
  Save,
  ImageIcon,
  Star,
  ListOrdered,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { triggerSuccess } from "@/lib/confetti";
import { productSchema, type ProductFormValues } from "@/app/dashboard/products/schema";
import {
  createProduct,
  createCategory,
  updateProduct,
  uploadProductImage,
} from "@/app/dashboard/products/actions";
import type {
  ActiveSupplierOption,
  CategoryOption,
  ProductWithRelations,
} from "@/app/dashboard/products/actions";
import { formatDateTimeEsCO } from "@/lib/calendar-date";
import { motion } from "framer-motion";

const inputClassName =
  "rounded-lg h-10 border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors";

function formatAmountDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const [intPart, decPart] = String(value).split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${withDots},${decPart.slice(0, 2)}` : withDots;
}

function parseAmountInput(input: string): number | undefined {
  const trimmed = input.trim().replace(/\s/g, "");
  if (trimmed === "") return undefined;
  const withoutThousands = trimmed.replace(/\./g, "");
  const withDecimalDot = withoutThousands.replace(",", ".");
  const num = parseFloat(withDecimalDot);
  return Number.isNaN(num) ? undefined : num;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: ActiveSupplierOption[];
  categories: CategoryOption[];
  onSuccess: () => void;
  /** When set, form is in edit mode and will call updateProduct on submit */
  initialData?: ProductWithRelations | null;
}

const defaultValues: ProductFormValues = {
  name: "",
  presentation: "",
  packaging: "",
  cost: 0,
  selling_price: 0,
  supplier_id: "",
  category_id: "",
  image_url: "",
  featured_on_landing: false,
  featured_sort_order: 0,
};

export function ProductForm({
  open,
  onOpenChange,
  suppliers,
  categories,
  onSuccess,
  initialData,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newlyAddedCategory, setNewlyAddedCategory] = React.useState<CategoryOption | null>(null);
  const isCreatingCategoryRef = React.useRef(false);
  const productImageInputRef = React.useRef<HTMLInputElement>(null);
  const [productImageUploading, setProductImageUploading] = React.useState(false);

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues,
  });

  const imageUrlWatch = form.watch("image_url");

  React.useEffect(() => {
    if (!String(imageUrlWatch ?? "").trim()) {
      form.setValue("featured_on_landing", false);
    }
  }, [imageUrlWatch, form]);

  const displayCategories = React.useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    if (newlyAddedCategory && !byId.has(newlyAddedCategory.id)) {
      byId.set(newlyAddedCategory.id, newlyAddedCategory);
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, newlyAddedCategory]);

  async function handleCreateCategory() {
    if (isCreatingCategoryRef.current) return;
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Ingrese el nombre de la categoría");
      return;
    }
    isCreatingCategoryRef.current = true;
    try {
      const result = await createCategory(trimmed);
      if (result.success && result.id) {
        triggerSuccess();
        toast.success("🎉 ¡Excelente! La categoría fue creada con éxito");
        setNewlyAddedCategory({ id: result.id, name: trimmed });
        form.setValue("category_id", result.id);
        setCategoryDialogOpen(false);
        setNewCategoryName("");
        startTransition(() => router.refresh());
      } else {
        toast.error(result.error ?? "Error al crear la categoría");
      }
    } finally {
      isCreatingCategoryRef.current = false;
    }
  }

  React.useEffect(() => {
    if (!open) setNewlyAddedCategory(null);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          name: initialData.name,
          presentation: initialData.presentation,
          packaging: initialData.packaging ?? "",
          cost: initialData.cost,
          selling_price: initialData.selling_price,
          supplier_id: initialData.supplier_id,
          category_id: initialData.category_id,
          image_url: initialData.image_url ?? "",
          featured_on_landing: initialData.featured_on_landing ?? false,
          featured_sort_order: initialData.featured_sort_order ?? 0,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, initialData, form]);

  async function handleProductImageFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProductImageUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadProductImage(fd);
      if (result.success) {
        form.setValue("image_url", result.url, { shouldValidate: true, shouldDirty: true });
        toast.success("Imagen subida. Recordá guardar el producto.");
      } else {
        toast.error(result.error);
      }
    } finally {
      setProductImageUploading(false);
    }
  }

  async function onSubmit(values: ProductFormValues) {
    const isEdit = Boolean(initialData?.id);
    const result = isEdit
      ? await updateProduct(initialData!.id, values)
      : await createProduct(values);

    if (result.success) {
      triggerSuccess();
      toast.success(
        isEdit ? "🎉 ¡Excelente! El producto fue actualizado con éxito" : "🎉 ¡Excelente! El producto fue registrado con éxito"
      );
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? (isEdit ? "Error al actualizar el producto" : "Error al guardar el producto"));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          overlayClassName="bg-black/50 backdrop-blur-md"
          className="max-w-lg w-full p-0 gap-0 border border-border rounded-[24px] shadow-2xl bg-card overflow-hidden data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100 dark:bg-zinc-950/95 dark:border-zinc-800"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {initialData ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete los datos del producto. El stock se gestiona desde inventario.
          </DialogDescription>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col"
          >
            <div className="relative bg-gradient-to-br from-primary/15 via-card to-card border-b border-border pl-6 pr-20 py-5 dark:from-blue-950/80 dark:via-zinc-900/90 dark:to-zinc-950 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary dark:bg-blue-500/20 dark:text-blue-400">
                  <Package className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    {initialData ? "Editar Producto" : "Nuevo Producto"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Complete los datos del producto. El stock se gestiona desde inventario.
                  </p>
                  {initialData ? (
                    <p className="mt-2 text-xs text-muted-foreground/90">
                      Última actualización en sistema:{" "}
                      <span className="font-medium text-foreground/90">
                        {formatDateTimeEsCO(
                          initialData.updated_at ?? initialData.created_at ?? null,
                        )}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Package className="size-4 text-primary shrink-0" aria-hidden />
                          Nombre del producto
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej. Guantes nitrilo"
                            className={inputClassName}
                            {...field}
                            value={(field.value as string) ?? ""}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="presentation"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Box className="size-4 text-primary shrink-0" aria-hidden />
                          Presentación
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej. Paquete x20"
                            className={inputClassName}
                            {...field}
                            value={(field.value as string) ?? ""}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="packaging"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Layers className="size-4 text-primary shrink-0" aria-hidden />
                          Caja madre / Paca (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej. Paca x200"
                            className={inputClassName}
                            {...field}
                            value={(field.value as string) ?? ""}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <CircleDollarSign className="size-4 text-primary shrink-0" aria-hidden />
                          Costo
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0 o 0,00"
                            className={inputClassName}
                            value={formatAmountDisplay(field.value as number | undefined)}
                            onChange={(e) => {
                              const parsed = parseAmountInput(e.target.value);
                              field.onChange(parsed === undefined ? 0 : parsed);
                            }}
                            onBlur={field.onBlur}
                            aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center gap-2">
                          <Truck className="size-4 text-primary shrink-0" aria-hidden />
                          Proveedor
                        </FormLabel>
                        <FormControl>
                          <SearchCombobox
                            key={open ? "open" : "closed"}
                            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                            value={field.value != null ? String(field.value) : ""}
                            onChange={field.onChange}
                            placeholder="Buscar proveedor..."
                            inputClassName={inputClassName}
                            emptyMessage="Ningún proveedor coincide con la búsqueda."
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel className="text-muted-foreground flex items-center gap-2">
                            <Tag className="size-4 text-primary shrink-0" aria-hidden />
                            Categoría
                          </FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary gap-1"
                            onClick={() => setCategoryDialogOpen(true)}
                          >
                            <Plus className="size-3" />
                            Nueva
                          </Button>
                        </div>
                        <FormControl>
                          <SearchCombobox
                            key={open ? "open" : "closed"}
                            options={displayCategories.map((c) => ({ value: c.id, label: c.name }))}
                            value={field.value != null ? String(field.value) : ""}
                            onChange={field.onChange}
                            placeholder="Buscar categoría..."
                            inputClassName={inputClassName}
                            emptyMessage="Ninguna categoría coincide con la búsqueda."
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />

                  <div className="rounded-xl border border-border bg-muted/25 p-4 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Página web — carrusel de destacados
                    </p>
                    <p className="text-xs text-muted-foreground">
                      La imagen es opcional. Solo los productos con imagen pueden marcarse para
                      el carrusel público.
                    </p>

                    <input
                      ref={productImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={handleProductImageFileChange}
                      aria-hidden
                    />

                    {String(imageUrlWatch ?? "").trim() ? (
                      <div className="relative overflow-hidden rounded-lg border border-border bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={String(imageUrlWatch)}
                          alt="Vista previa del producto"
                          className="mx-auto max-h-40 w-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-2 h-8 rounded-md text-xs"
                          onClick={() => {
                            form.setValue("image_url", "", {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                        >
                          Quitar imagen
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg gap-2"
                        disabled={productImageUploading}
                        onClick={() => productImageInputRef.current?.click()}
                      >
                        <ImageIcon className="size-4 shrink-0" aria-hidden />
                        {productImageUploading ? "Subiendo…" : "Subir imagen"}
                      </Button>
                      <span className="self-center text-[11px] text-muted-foreground">
                        JPG, PNG, WebP o GIF · máx. 5 MB
                      </span>
                    </div>

                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="size-4 text-primary shrink-0" aria-hidden />
                            O pegar URL de imagen
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://… (opcional)"
                              className={inputClassName}
                              {...field}
                              value={(field.value as string) ?? ""}
                              aria-invalid={fieldState.invalid}
                            />
                          </FormControl>
                          <FormMessage>{fieldState.error?.message}</FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="featured_on_landing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-lg border border-input bg-background/50 px-3 py-2.5">
                          <FormControl>
                            <input
                              type="checkbox"
                              id="featured_on_landing"
                              checked={Boolean(field.value)}
                              disabled={!String(imageUrlWatch ?? "").trim()}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="size-4 accent-blue-600 disabled:opacity-40"
                            />
                          </FormControl>
                          <div className="space-y-0.5 leading-none">
                            <FormLabel
                              htmlFor="featured_on_landing"
                              className={`flex items-center gap-2 text-sm font-medium text-foreground ${!String(imageUrlWatch ?? "").trim() ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              <Star className="size-3.5 text-amber-500" aria-hidden />
                              Mostrar en &quot;Productos destacados&quot;
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Opcional. Requiere imagen (subida o URL). Orden menor = aparece
                              antes.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="featured_sort_order"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground flex items-center gap-2">
                            <ListOrdered className="size-4 text-primary shrink-0" aria-hidden />
                            Orden en carrusel
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              className={inputClassName}
                              {...field}
                              value={(field.value as number | undefined) ?? 0}
                              onChange={(e) => {
                                const v = e.target.valueAsNumber;
                                field.onChange(Number.isNaN(v) ? 0 : v);
                              }}
                              aria-invalid={fieldState.invalid}
                            />
                          </FormControl>
                          <FormMessage>{fieldState.error?.message}</FormMessage>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t border-border bg-muted/50 px-6 py-4 flex flex-wrap items-center justify-end gap-2 rounded-b-[24px]">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg border-border hover:bg-muted gap-2"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-4" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    <Save className="size-4" />
                    {form.formState.isSubmitting ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent
          overlayClassName="bg-black/50 backdrop-blur-md"
          className="sm:max-w-sm border border-border rounded-[24px] shadow-2xl dark:bg-zinc-950/95 dark:border-zinc-800"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              Nueva categoría
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label htmlFor="new-category-name" className="text-sm font-medium text-muted-foreground">
                Nombre de la categoría
              </label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej. Insumos"
                className="rounded-lg h-10 border-input focus-visible:ring-2 focus-visible:ring-primary/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={isPending || !newCategoryName.trim()}
              className="w-full rounded-lg bg-primary hover:bg-primary/90 gap-2"
            >
              <Save className="size-4" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
