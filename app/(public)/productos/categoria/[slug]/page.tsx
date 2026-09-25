import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/public/Footer";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
  LANDING_SECTION_PANEL_PAD,
} from "@/components/public/landing-section-styles";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { getPublicCategoryBySlug, getPublicCategories } from "@/lib/public-categories";
import { PUBLIC_PRODUCTS_TABLE } from "@/lib/public-products-table";
import { categorySearchDescription, categorySearchTitle } from "@/lib/public-seo";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { getPublicSocialSettings } from "@/utils/public-settings";

const CARD_THEMES = [
  "from-blue-500/30 to-cyan-500/20",
  "from-purple-500/30 to-blue-500/20",
  "from-emerald-500/30 to-teal-500/20",
  "from-orange-500/30 to-rose-500/20",
] as const;

type CategoryProductRow = {
  id: string;
  name: string;
  slug: string;
  presentation: string;
  image_url: string | null;
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);
  if (!category) {
    return { title: "Categoría no encontrada", robots: { index: false, follow: false } };
  }

  const title = categorySearchTitle(category.name);
  const description = categorySearchDescription(category.name);
  return {
    title,
    description,
    alternates: { canonical: `/productos/categoria/${category.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);
  if (!category) notFound();

  const supabase = await createClient();
  const [productsRes, socialSettings, categories] = await Promise.all([
    supabase
      .from(PUBLIC_PRODUCTS_TABLE)
      .select("id, name, slug, presentation, image_url")
      .eq("category_id", category.id)
      .not("slug", "is", null)
      .not("image_url", "is", null)
      .order("name", { ascending: true }),
    getPublicSocialSettings(),
    getPublicCategories(),
  ]);

  if (productsRes.error) {
    console.error("Category products:", productsRes.error);
  }

  const products = ((productsRes.data ?? []) as unknown as CategoryProductRow[]).filter(
    (row) => Boolean(row.slug?.trim()) && Boolean(row.image_url?.trim()),
  );
  const description = categorySearchDescription(category.name);

  return (
    <main className="relative z-10 pb-24 pt-8 sm:pt-10">
      <ScrollFadeSection className="relative bg-transparent">
        <div className={LANDING_PAGE_GUTTER}>
          <Link
            href="/productos"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-blue-400"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Volver al catálogo
          </Link>

          <div className={cn(LANDING_SECTION_PANEL, LANDING_SECTION_PANEL_PAD)}>
            <PublicSectionHeading size="compact">{category.name} al por mayor y al detal</PublicSectionHeading>
            <p className="mt-3 max-w-2xl text-zinc-400">{description}</p>

            {categories.length > 1 ? (
              <nav aria-label="Otras categorías" className="mt-6 flex flex-wrap gap-2">
                {categories.map((item) => (
                  <Link
                    key={item.id}
                    href={`/productos/categoria/${item.slug}`}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                      item.slug === category.slug
                        ? "border-blue-400/70 bg-blue-500/15 text-blue-100"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white",
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            ) : null}

            {products.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-400">
                Todavía no hay fotos publicadas en {category.name}. Mirá el resto del catálogo.
              </div>
            ) : (
              <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((row, index) => {
                  const theme = CARD_THEMES[index % CARD_THEMES.length];
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/productos/${row.slug}`}
                        className="group relative flex min-h-[240px] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                      >
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70",
                            theme,
                          )}
                          aria-hidden
                        />
                        <div className="relative z-10 flex flex-1 flex-col">
                          {row.image_url ? (
                            <div className="relative mx-auto mb-3 mt-2 h-24 w-full max-w-[120px]">
                              <Image
                                src={row.image_url}
                                alt={row.name}
                                fill
                                sizes="120px"
                                className="object-contain object-center drop-shadow-md transition duration-300 group-hover:scale-[1.03]"
                              />
                            </div>
                          ) : null}
                          <h2 className="text-lg font-bold leading-tight text-zinc-100">{row.name}</h2>
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-200/85">{row.presentation}</p>
                          <span className="mt-auto pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/90">
                            Ver ficha
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={cn(LANDING_SECTION_PANEL, "mt-8 overflow-hidden")}>
            <Footer socialSettings={socialSettings} />
          </div>
        </div>
      </ScrollFadeSection>
    </main>
  );
}
