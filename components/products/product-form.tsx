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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { triggerSuccess } from "@/lib/confetti";
import { productSchema, type ProductFormValues } from "@/app/dashboard/products/schema";
import { createProduct, createCategory, updateProduct } from "@/app/dashboard/products/actions";
import type {
  ActiveSupplierOption,
  CategoryOption,
  ProductWithRelations,
} from "@/app/dashboard/products/actions";
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

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues,
  });

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
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, initialData, form]);

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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value != null ? String(field.value) : ""}
                        >
                          <FormControl>
                            <SelectTrigger className={inputClassName}>
                              <SelectValue placeholder="Seleccione un proveedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value != null ? String(field.value) : ""}
                        >
                          <FormControl>
                            <SelectTrigger className={inputClassName}>
                              <SelectValue placeholder="Seleccione una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {displayCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
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
