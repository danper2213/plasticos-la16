import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/public/Footer";
import { PublicSectionBar, PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
  LANDING_SECTION_PANEL_PAD,
} from "@/components/public/landing-section-styles";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { PUBLIC_PRODUCTS_TABLE } from "@/lib/public-products-table";
import { getPublicSocialSettings } from "@/utils/public-settings";

export const metadata: Metadata = {
  title: "Catálogo de productos | PLASTICOS LA 16",
  description:
    "Explorá el catálogo de plásticos, empaques y vasos al por mayor. Cotizá con PLASTICOS LA 16.",
};

const CARD_THEMES = [
  "from-blue-500/30 to-cyan-500/20",
  "from-purple-500/30 to-blue-500/20",
  "from-emerald-500/30 to-teal-500/20",
  "from-orange-500/30 to-rose-500/20",
] as const;

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  presentation: string;
  image_url: string | null;
  og_image: string | null;
  product_categories: { name: string } | { name: string }[] | null;
};

function categoryLabel(row: CatalogRow): string {
  const c = row.product_categories;
  const name = Array.isArray(c) ? c[0]?.name : c?.name;
  return (name ?? "General").trim() || "General";
}

function displayImage(row: CatalogRow): string | null {
  return row.image_url?.trim() || row.og_image?.trim() || null;
}

export default async function ProductosIndexPage() {
  const supabase = await createClient();
  const socialSettings = await getPublicSocialSettings();

  const { data, error } = await supabase
    .from(PUBLIC_PRODUCTS_TABLE)
    .select(
      `
      id,
      name,
      slug,
      presentation,
      image_url,
      og_image,
      product_categories ( name )
    `,
    )
    .not("slug", "is", null)
    .not("image_url", "is", null)
    .order("name", { ascending: true })
    .limit(400);

  if (error) {
    console.error("Catálogo público:", error);
  }

  // Solo fichas con imagen real (image_url) y slug para enlace público.
  const rows = ((data ?? []) as unknown as CatalogRow[]).filter(
    (r) => Boolean(r.slug?.trim()) && Boolean(r.image_url?.trim()),
  );

  return (
    <main className="relative z-10 pb-24 pt-8 sm:pt-10">
      <ScrollFadeSection className="relative bg-transparent">
        <div className={LANDING_PAGE_GUTTER}>
          <Link
            href="/#catalogo"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-blue-400"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Volver al inicio
          </Link>

          <div className={cn(LANDING_SECTION_PANEL, LANDING_SECTION_PANEL_PAD)}>
            <PublicSectionHeading size="compact">Catálogo completo</PublicSectionHeading>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Productos con foto y ficha propia. Elegí uno para ver detalles y cotizar.
            </p>

            {rows.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-400">
                No hay productos con imagen publicados aún. Volvé pronto o contactanos por WhatsApp.
              </div>
            ) : (
              <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((row, index) => {
                  const img = displayImage(row);
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
                        <div
                          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_55%)]"
                          aria-hidden
                        />
                        <div className="relative z-10 flex flex-1 flex-col">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                            {categoryLabel(row)}
                          </p>
                          {img ? (
                            <div className="relative mx-auto mb-3 mt-2 h-24 w-full max-w-[120px]">
                              <Image
                                src={img}
                                alt=""
                                fill
                                sizes="120px"
                                className="object-contain object-center drop-shadow-md transition duration-300 group-hover:scale-[1.03]"
                              />
                            </div>
                          ) : null}
                          <h2 className="text-lg font-bold leading-tight text-zinc-100">{row.name}</h2>
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-200/85">{row.presentation}</p>
                          <span className="mt-auto pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/90 transition group-hover:text-blue-200">
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
