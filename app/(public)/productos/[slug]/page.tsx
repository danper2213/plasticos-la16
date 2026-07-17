import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, MessageCircle, Package, Tag } from "lucide-react";
import { Footer } from "@/components/public/Footer";
import { PublicSectionBar } from "@/components/public/PublicSectionHeading";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
} from "@/components/public/landing-section-styles";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { PUBLIC_PRODUCTS_TABLE } from "@/lib/public-products-table";
import { getPublicSocialSettings } from "@/utils/public-settings";

const SITE_SUFFIX = " | PLASTICOS LA 16";

const RELATED_CARD_THEMES = [
  "from-blue-500/30 to-cyan-500/20",
  "from-purple-500/30 to-blue-500/20",
  "from-emerald-500/30 to-teal-500/20",
  "from-orange-500/30 to-rose-500/20",
] as const;

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  presentation,
  packaging,
  image_url,
  meta_title,
  meta_description,
  og_image,
  category_id,
  product_categories ( name )
`;

type PublicProductPageRow = {
  id: string;
  name: string;
  slug: string;
  presentation: string;
  packaging: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  category_id: string;
  product_categories: { name: string } | { name: string }[] | null;
};

type RelatedProductRow = {
  id: string;
  name: string;
  slug: string;
  presentation: string;
  image_url: string | null;
  og_image: string | null;
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

const fetchProductBySlug = cache(async (slug: string): Promise<PublicProductPageRow | null> => {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_PRODUCTS_TABLE)
    .select(PRODUCT_SELECT)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    console.error("Product page fetch:", error);
    return null;
  }

  if (!data) return null;
  return data as unknown as PublicProductPageRow;
});

async function fetchRelatedProducts(
  categoryId: string,
  excludeId: string,
): Promise<RelatedProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLIC_PRODUCTS_TABLE)
    .select("id, name, slug, presentation, image_url, og_image")
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .not("slug", "is", null)
    .order("name", { ascending: true })
    .limit(4);

  if (error) {
    console.error("Related products fetch:", error);
    return [];
  }

  return ((data ?? []) as unknown as RelatedProductRow[]).filter(
    (row) => Boolean(row.slug?.trim()),
  );
}

function resolveCategoryName(
  category: PublicProductPageRow["product_categories"],
): string {
  const name = Array.isArray(category) ? category[0]?.name : category?.name;
  return (name ?? "General").trim() || "General";
}

function buildPageTitle(metaTitle: string | null, productName: string): string {
  const base = metaTitle?.trim() || productName;
  if (base.includes("PLASTICOS LA 16")) return base;
  return `${base}${SITE_SUFFIX}`;
}

function buildMetadataDescription(
  metaDescription: string | null,
  presentation: string,
  productName: string,
): string {
  return (
    metaDescription?.trim() ||
    `${productName} — ${presentation}. Plásticos y empaques al por mayor en PLASTICOS LA 16.`
  );
}

function resolveDisplayImage(imageUrl: string | null, ogImage: string | null): string | null {
  return imageUrl?.trim() || ogImage?.trim() || null;
}

function splitDescriptionParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildWhatsAppHref(whatsappUrl: string, productName: string): string {
  const text = encodeURIComponent(
    `Hola PLASTICOS LA 16, quiero cotizar ${productName}.`,
  );
  return whatsappUrl.includes("?")
    ? `${whatsappUrl}&text=${text}`
    : `${whatsappUrl}?text=${text}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    return {
      title: `Producto no encontrado${SITE_SUFFIX}`,
      robots: { index: false, follow: false },
    };
  }

  const title = buildPageTitle(product.meta_title, product.name);
  const description = buildMetadataDescription(
    product.meta_description,
    product.presentation,
    product.name,
  );
  const ogImage = product.og_image?.trim() || product.image_url?.trim();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, alt: product.name }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const categoryName = resolveCategoryName(product.product_categories);
  const displayImage = resolveDisplayImage(product.image_url, product.og_image);
  const descriptionText = buildMetadataDescription(
    product.meta_description,
    product.presentation,
    product.name,
  );
  const descriptionParagraphs = splitDescriptionParagraphs(descriptionText);

  const [relatedProducts, socialSettings] = await Promise.all([
    fetchRelatedProducts(product.category_id, product.id),
    getPublicSocialSettings(),
  ]);

  const whatsappHref = buildWhatsAppHref(socialSettings.whatsapp_url, product.name);

  return (
    <main className="relative z-10 pb-24 pt-8 sm:pt-10">
      <div className={LANDING_PAGE_GUTTER}>
        <nav
          aria-label="Ruta de navegación"
          className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-400"
        >
          <Link href="/" className="transition hover:text-zinc-200">
            Inicio
          </Link>
          <span aria-hidden className="text-zinc-600">
            /
          </span>
          <Link href="/#catalogo" className="transition hover:text-zinc-200">
            Catálogo
          </Link>
          <span aria-hidden className="text-zinc-600">
            /
          </span>
          <span className="text-zinc-500">{categoryName}</span>
          <span aria-hidden className="text-zinc-600">
            /
          </span>
          <span className="font-medium text-zinc-200">{product.name}</span>
        </nav>

        <article
          itemScope
          itemType="https://schema.org/Product"
          className={cn(LANDING_SECTION_PANEL, "overflow-hidden")}
        >
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-10">
            <div className="flex flex-col gap-4">
              <Link
                href="/#catalogo"
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-blue-400"
              >
                <ArrowLeft className="size-4 shrink-0" aria-hidden />
                Volver al catálogo
              </Link>

              <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/80 lg:mx-0">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 480px"
                    className="object-contain p-6 sm:p-8"
                    itemProp="image"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <Image
                      src="/logo.png"
                      alt=""
                      width={120}
                      height={120}
                      className="opacity-80"
                      aria-hidden
                    />
                    <p className="text-sm text-zinc-500">Imagen próximamente</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400/90">
                {categoryName}
              </p>
              <h1
                className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl"
                itemProp="name"
              >
                {product.name}
              </h1>

              <dl className="mt-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 sm:p-5">
                <div className="flex gap-3">
                  <dt className="flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    <Package className="size-4 text-blue-400" aria-hidden />
                    Presentación
                  </dt>
                  <dd className="text-sm font-medium text-zinc-100">
                    {product.presentation}
                  </dd>
                </div>
                {product.packaging?.trim() ? (
                  <div className="flex gap-3">
                    <dt className="flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      <Tag className="size-4 text-blue-400" aria-hidden />
                      Embalaje
                    </dt>
                    <dd className="text-sm font-medium text-zinc-100">{product.packaging}</dd>
                  </div>
                ) : null}
              </dl>

              <section
                aria-labelledby="product-description-heading"
                className="mt-8"
              >
                <div className="flex items-start gap-3">
                  <PublicSectionBar className="mt-1 h-9 sm:h-10" />
                  <div className="min-w-0 flex-1">
                    <h2
                      id="product-description-heading"
                      className="text-xl font-bold uppercase tracking-wide text-white sm:text-2xl"
                    >
                      Descripción
                    </h2>
                    <div
                      className="mt-4 space-y-4 text-base leading-relaxed text-zinc-300"
                      itemProp="description"
                    >
                      {descriptionParagraphs.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  Cotizar por WhatsApp
                </a>
                <Link
                  href="/#catalogo"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/80"
                >
                  Ver más productos
                </Link>
              </div>
            </div>
          </div>
        </article>

        {relatedProducts.length > 0 ? (
          <section
            aria-labelledby="related-products-heading"
            className={cn(LANDING_SECTION_PANEL, "mt-8 overflow-hidden p-5 sm:p-8 lg:p-10")}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <PublicSectionBar className="mt-1 h-9 sm:h-10" />
              <h2
                id="related-products-heading"
                className="text-xl font-bold uppercase tracking-wide text-white sm:text-2xl"
              >
                También podría interesarte
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related, index) => {
                const relatedImage = resolveDisplayImage(related.image_url, related.og_image);
                const theme = RELATED_CARD_THEMES[index % RELATED_CARD_THEMES.length];

                return (
                  <article
                    key={related.id}
                    className="group relative flex min-h-[260px] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10"
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

                    <Link
                      href={`/productos/${related.slug}`}
                      className="relative z-10 flex flex-1 flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                      {relatedImage ? (
                        <div className="relative mx-auto mb-4 h-28 w-full max-w-[140px]">
                          <Image
                            src={relatedImage}
                            alt=""
                            fill
                            sizes="140px"
                            className="object-contain object-center drop-shadow-md transition duration-300 group-hover:scale-[1.03]"
                          />
                        </div>
                      ) : null}

                      <h3 className="text-lg font-bold leading-tight text-zinc-100">
                        {related.name}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-200/85">{related.presentation}</p>
                      <span className="mt-auto pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/90 transition group-hover:text-blue-200">
                        Ver producto
                      </span>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className={cn(LANDING_SECTION_PANEL, "mt-8 overflow-hidden")}>
          <Footer socialSettings={socialSettings} />
        </div>
      </div>
    </main>
  );
}
