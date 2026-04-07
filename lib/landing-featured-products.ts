import type { SupabaseClient } from "@supabase/supabase-js";

export type LandingFeaturedProduct = {
  id: string;
  name: string;
  presentation: string;
  image_url: string;
  category_name: string | null;
};

/**
 * `true`: muestra ítems de demostración (URLs e inventario ficticio).
 * Pon `false` cuando en BD tengas `image_url` y `featured_on_landing` en productos reales.
 */
export const LANDING_FEATURED_PRODUCTS_USE_DEMO_PLACEHOLDERS = false;

/** Solo se usa si LANDING_FEATURED_PRODUCTS_USE_DEMO_PLACEHOLDERS === true. Eliminar cuando pases a datos reales. */
const DEMO_FEATURED_PRODUCTS: LandingFeaturedProduct[] = [
  {
    id: "demo-1",
    name: "Vasos desechables 7 oz",
    presentation: "Paquete x50 unidades",
    image_url: "https://images.unsplash.com/photo-1610701596007-115028617dc0?w=400&h=520&fit=crop",
    category_name: "Vasos",
  },
  {
    id: "demo-2",
    name: "Contenedores con tapa",
    presentation: "Caja x24 — 500 ml",
    image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=520&fit=crop",
    category_name: "Empaques",
  },
  {
    id: "demo-3",
    name: "Bolsas camiseta reforzada",
    presentation: "Rollo x100 — alta densidad",
    image_url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=520&fit=crop",
    category_name: "Bolsas",
  },
  {
    id: "demo-4",
    name: "Cuchara postre blanca",
    presentation: "Bolsa x100",
    image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=520&fit=crop",
    category_name: "Cubiertos",
  },
  {
    id: "demo-5",
    name: "Plato hondo foam",
    presentation: "Paquete x20",
    image_url: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=520&fit=crop",
    category_name: "Platos",
  },
  {
    id: "demo-6",
    name: "Pitillo flexible",
    presentation: "Bolsa x200 — colores surtidos",
    image_url: "https://images.unsplash.com/photo-1526401485004-46910ecc8e51?w=400&h=520&fit=crop",
    category_name: "Pitillos",
  },
  {
    id: "demo-7",
    name: "Film stretch industrial",
    presentation: "Rollo 300 m",
    image_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=520&fit=crop",
    category_name: "Empaques",
  },
  {
    id: "demo-8",
    name: "Guantes nitrilo",
    presentation: "Caja x100 — talla M",
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=520&fit=crop",
    category_name: "Higiene",
  },
];

interface PublicFeaturedRow {
  id: string;
  name: string;
  presentation: string;
  image_url: string | null;
  product_categories: { name: string } | { name: string }[] | null;
}

export async function getLandingFeaturedProducts(
  supabase: SupabaseClient,
): Promise<LandingFeaturedProduct[]> {
  if (LANDING_FEATURED_PRODUCTS_USE_DEMO_PLACEHOLDERS) {
    return DEMO_FEATURED_PRODUCTS;
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
      id,
      name,
      presentation,
      image_url,
      product_categories ( name )
    `,
      )
      .eq("is_active", true)
      .eq("featured_on_landing", true)
      .not("image_url", "is", null)
      .order("featured_sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(24);

    if (error) {
      console.error("getLandingFeaturedProducts:", error);
      return [];
    }

    return ((data ?? []) as unknown as PublicFeaturedRow[])
      .filter((row) => row.image_url?.trim())
      .map((row) => {
        const cat = row.product_categories;
        const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
        return {
          id: row.id,
          name: row.name,
          presentation: row.presentation,
          image_url: row.image_url!.trim(),
          category_name: categoryName ?? null,
        };
      });
  } catch (e) {
    console.error("getLandingFeaturedProducts unexpected:", e);
    return [];
  }
}
