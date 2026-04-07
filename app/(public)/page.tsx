import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Hero } from "@/components/public/Hero";
import { SocialFeed, type SocialPost } from "@/components/public/SocialFeed";
import { Footer } from "@/components/public/Footer";
import { CatalogPreview, type PublicCatalogItem } from "@/components/public/CatalogPreview";
import { SuppliersMarquee, type PublicSupplier } from "@/components/public/SuppliersMarquee";
import { FeaturedProductsMarquee } from "@/components/public/FeaturedProductsMarquee";
import { AboutSection } from "@/components/public/AboutSection";
import { LocationSection } from "@/components/public/LocationSection";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
} from "@/components/public/landing-section-styles";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PUBLIC_SOCIAL_SETTINGS,
  getPublicSocialSettings,
} from "@/utils/public-settings";
import { getLandingFeaturedProducts } from "@/lib/landing-featured-products";

function rowsFromSupabase<T>(
  settled: PromiseSettledResult<{ data: T | null; error: { message?: string } | null }>,
  label: string,
): T | null {
  if (settled.status === "rejected") {
    console.error(`Landing ${label}:`, settled.reason);
    return null;
  }
  const { data, error } = settled.value;
  if (error) {
    console.error(`Landing ${label}:`, error);
    return null;
  }
  return data ?? null;
}

interface PublicCategoryRow {
  name: string | null;
}

interface PublicProductRow {
  id: string;
  name: string;
  presentation: string;
  stock_quantity: number | null;
  product_categories: { name: string } | { name: string }[] | null;
}

interface PublicSocialPostRow {
  id: string;
  caption: string | null;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
}

interface PublicSupplierRow {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

/** Eslogan sobre el video del hero (edita cuando lo tengas definido). Deja "" para ocultarlo. */
const HERO_SLOGAN =
  "LIDERES EN CALIDAD, EXPERTOS EN SERVICIO";
/**
 * Landing pública en `/`.
 * Usuarios con sesión activa siguen yendo al dashboard.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const [
    categoriesSettled,
    productsSettled,
    socialSettled,
    suppliersSettled,
    featuredSettled,
    settingsSettled,
  ] = await Promise.allSettled([
    supabase
      .from("product_categories")
      .select("name")
      .order("name", { ascending: true })
      .limit(8),
    supabase
      .from("products")
      .select(
        `
      id,
      name,
      presentation,
      stock_quantity,
      product_categories ( name )
    `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
      // Catálogo por categoría: debe incluir todos los activos, no un subconjunto fijo.
      .limit(5000),
    supabase
      .from("social_posts")
      .select("id, caption, media_url, media_type, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("suppliers")
      .select("id, name, logo_url, website_url")
      .eq("is_active", true)
      .eq("show_on_website", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    getLandingFeaturedProducts(supabase),
    getPublicSocialSettings(),
  ]);

  const categoryRows = rowsFromSupabase(categoriesSettled, "product_categories");
  const productRows = rowsFromSupabase(productsSettled, "products");
  const socialRows = rowsFromSupabase(socialSettled, "social_posts");
  const supplierRows = rowsFromSupabase(suppliersSettled, "suppliers");

  const featuredProducts =
    featuredSettled.status === "fulfilled"
      ? featuredSettled.value
      : (() => {
          console.error("Landing featured products:", featuredSettled.reason);
          return [];
        })();

  const socialSettings =
    settingsSettled.status === "fulfilled"
      ? settingsSettled.value
      : (() => {
          console.error("Landing public settings:", settingsSettled.reason);
          return DEFAULT_PUBLIC_SOCIAL_SETTINGS;
        })();

  const rotatingWords = ((categoryRows ?? []) as unknown as PublicCategoryRow[])
    .map((row) => row.name?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((value, index, arr) => arr.indexOf(value) === index);
  const products = ((productRows ?? []) as unknown as PublicProductRow[])
    .map((row): PublicCatalogItem => {
      const category = Array.isArray(row.product_categories)
        ? row.product_categories[0]?.name
        : row.product_categories?.name;
      const categoryLabel = (category ?? "General").trim() || "General";
      return {
        id: row.id,
        name: row.name,
        presentation: row.presentation,
        stock_quantity: row.stock_quantity,
        category_name: categoryLabel,
      };
    })
    .filter((row) => row.name && row.presentation);
  const socialPosts = ((socialRows ?? []) as unknown as PublicSocialPostRow[]).map(
    (row): SocialPost => ({
      id: row.id,
      caption: row.caption ?? "",
      media_url: row.media_url,
      media_type: row.media_type,
      created_at: row.created_at,
    })
  );
  const publicSuppliers = ((supplierRows ?? []) as unknown as PublicSupplierRow[]).map(
    (row): PublicSupplier => ({
      id: row.id,
      name: row.name,
      logo_url: row.logo_url,
      website_url: row.website_url,
    })
  );

  return (
    <main className="relative z-10 pb-24">
      <Hero rotatingWords={rotatingWords} slogan={HERO_SLOGAN} />

      <AboutSection />

      <FeaturedProductsMarquee
        products={featuredProducts}
        whatsappUrl={socialSettings.whatsapp_url}
      />

      <CatalogPreview products={products} whatsappUrl={socialSettings.whatsapp_url} />

      <SocialFeed posts={socialPosts} />

      <SuppliersMarquee suppliers={publicSuppliers} />

      <LocationSection whatsappUrl={socialSettings.whatsapp_url} />

      <ScrollFadeSection className="relative bg-transparent py-12 sm:py-16">
        <div className={LANDING_PAGE_GUTTER}>
          <div className={cn(LANDING_SECTION_PANEL, "overflow-hidden")}>
            <Footer socialSettings={socialSettings} />
          </div>
        </div>
      </ScrollFadeSection>
    </main>
  );
}
