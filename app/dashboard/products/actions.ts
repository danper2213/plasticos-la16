"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/utils/supabase/require-user";
import type { ProductFormValues } from "./schema";

/** Raw row from Supabase with FK relations */
export interface ProductRow {
  id: string;
  name: string;
  presentation: string;
  packaging: string | null;
  cost: number;
  selling_price: number;
  /** null = no en bodega; number = cantidad en bodega */
  stock_quantity: number | null;
  is_active: boolean;
  supplier_id: string;
  category_id: string;
  image_url: string | null;
  featured_on_landing: boolean;
  featured_sort_order: number;
  created_at?: string;
  updated_at?: string;
  suppliers: { name: string } | { name: string }[] | null;
  product_categories: { name: string } | { name: string }[] | null;
}

export interface ProductWithRelations extends Omit<ProductRow, "suppliers" | "product_categories"> {
  supplier_name: string;
  category_name: string;
}

export interface ActiveSupplierOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const PRODUCTS_SELECT_FULL = `
      id,
      name,
      presentation,
      packaging,
      cost,
      selling_price,
      stock_quantity,
      is_active,
      supplier_id,
      category_id,
      image_url,
      featured_on_landing,
      featured_sort_order,
      created_at,
      updated_at,
      suppliers ( name ),
      product_categories ( name )
    `;

const PRODUCTS_SELECT_BASE = `
      id,
      name,
      presentation,
      packaging,
      cost,
      selling_price,
      stock_quantity,
      is_active,
      supplier_id,
      category_id,
      created_at,
      updated_at,
      suppliers ( name ),
      product_categories ( name )
    `;

export async function getProducts(): Promise<ProductWithRelations[]> {
  const { supabase } = await requireUser();
  let rowsRaw: Partial<ProductRow>[] | null = null;
  let error: { message?: string; code?: string } | null = null;

  const first = await supabase
    .from("products")
    .select(PRODUCTS_SELECT_FULL)
    .eq("is_active", true)
    .order("name", { ascending: true });

  rowsRaw = (first.data ?? []) as Partial<ProductRow>[];
  error = first.error;

  if (
    first.error &&
    (first.error.message?.toLowerCase().includes("column") || first.error.code === "42703")
  ) {
    const fb = await supabase
      .from("products")
      .select(PRODUCTS_SELECT_BASE)
      .eq("is_active", true)
      .order("name", { ascending: true });
    rowsRaw = (fb.data ?? []) as Partial<ProductRow>[];
    error = fb.error;
  }

  if (error) {
    console.error("getProducts error:", error);
    return [];
  }

  const rows = rowsRaw ?? [];
  return rows.map((row) => {
    const supplier = row.suppliers;
    const category = row.product_categories;
    const supplierName = Array.isArray(supplier) ? supplier[0]?.name : supplier?.name;
    const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
    return {
      id: row.id as string,
      name: row.name as string,
      presentation: row.presentation as string,
      packaging: row.packaging ?? null,
      cost: row.cost as number,
      selling_price: row.selling_price as number,
      stock_quantity: row.stock_quantity ?? null,
      is_active: Boolean(row.is_active),
      supplier_id: row.supplier_id as string,
      category_id: row.category_id as string,
      image_url: row.image_url ?? null,
      featured_on_landing: Boolean(row.featured_on_landing),
      featured_sort_order: Number(row.featured_sort_order ?? 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
      supplier_name: supplierName ?? "—",
      category_name: categoryName ?? "—",
    };
  });
}

export async function getActiveSuppliers(): Promise<ActiveSupplierOption[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getActiveSuppliers error:", error);
    return [];
  }
  return (data ?? []) as ActiveSupplierOption[];
}

export async function getCategories(): Promise<CategoryOption[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("getCategories error:", error);
    return [];
  }
  return (data ?? []) as CategoryOption[];
}

export async function createCategory(name: string) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { success: false as const, error: "El nombre de la categoría es obligatorio", id: undefined };
  }
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (error) {
    return { success: false as const, error: error.message, id: undefined };
  }
  revalidatePath("/dashboard/products");
  return { success: true as const, id: data.id as string };
}

const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_BUCKET = "product-images";

const ALLOWED_PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Sube una imagen al bucket `product-images` y devuelve la URL pública.
 * El producto se guarda después con create/update (este paso solo sube el archivo).
 */
export async function uploadProductImage(formData: FormData) {
  const { supabase, user } = await requireUser();

  try {
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file || file.size === 0) {
      return { success: false as const, error: "Seleccioná un archivo de imagen." };
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      return {
        success: false as const,
        error: "La imagen no puede superar 5 MB.",
      };
    }

    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(mime)) {
      return {
        success: false as const,
        error: "Formato no permitido. Usá JPG, PNG, WebP o GIF.",
      };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : "jpg";
    const uniquePath = `${user.id}/${Date.now()}-${safeName || `imagen.${ext}`}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(uniquePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: mime || undefined,
      });

    if (uploadError) {
      return {
        success: false as const,
        error: `No se pudo subir: ${uploadError.message}`,
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(uniquePath);

    return { success: true as const, url: publicUrl };
  } catch (e) {
    console.error("uploadProductImage:", e);
    return {
      success: false as const,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo completar la subida. Revisá el bucket y la conexión.",
    };
  }
}

export async function createProduct(data: ProductFormValues) {
  const { supabase } = await requireUser();
  const imageUrl = data.image_url?.trim() || null;
  const featured =
    Boolean(data.featured_on_landing) && Boolean(imageUrl);
  const nowIso = new Date().toISOString();
  const base = {
    name: data.name.trim(),
    presentation: data.presentation.trim(),
    packaging: data.packaging?.trim() || null,
    cost: data.cost,
    selling_price: data.selling_price ?? 0,
    supplier_id: data.supplier_id,
    category_id: data.category_id,
    is_active: true,
  };
  const withLanding = {
    ...base,
    image_url: imageUrl,
    featured_on_landing: featured,
    featured_sort_order: featured ? (data.featured_sort_order ?? 0) : 0,
    updated_at: nowIso,
  };

  let { error } = await supabase.from("products").insert(withLanding);
  if (error?.message?.toLowerCase().includes("column")) {
    const fb = await supabase.from("products").insert({ ...base, updated_at: nowIso });
    error = fb.error;
  }

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const };
}

export async function updateProduct(id: string, data: ProductFormValues) {
  const { supabase } = await requireUser();
  const imageUrl = data.image_url?.trim() || null;
  const featured =
    Boolean(data.featured_on_landing) && Boolean(imageUrl);
  const base = {
    name: data.name.trim(),
    presentation: data.presentation.trim(),
    packaging: data.packaging?.trim() || null,
    cost: data.cost,
    selling_price: data.selling_price ?? 0,
    supplier_id: data.supplier_id,
    category_id: data.category_id,
    updated_at: new Date().toISOString(),
  };
  const withLanding = {
    ...base,
    image_url: imageUrl,
    featured_on_landing: featured,
    featured_sort_order: featured ? (data.featured_sort_order ?? 0) : 0,
  };

  let { error } = await supabase.from("products").update(withLanding).eq("id", id);
  if (error?.message?.toLowerCase().includes("column")) {
    const fb = await supabase.from("products").update(base).eq("id", id);
    error = fb.error;
  }

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const };
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return { success: true as const };
}
