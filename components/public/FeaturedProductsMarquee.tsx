"use client";

import type { CSSProperties } from "react";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
  LANDING_SECTION_PANEL_PAD,
} from "@/components/public/landing-section-styles";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";
import type { LandingFeaturedProduct } from "@/lib/landing-featured-products";

/** Mismos acentos que las tarjetas de categoría en `CatalogPreview`. */
const FEATURED_CARD_THEMES = [
  "from-blue-500/30 to-cyan-500/20",
  "from-purple-500/30 to-blue-500/20",
  "from-emerald-500/30 to-teal-500/20",
  "from-orange-500/30 to-rose-500/20",
] as const;

interface FeaturedProductsMarqueeProps {
  products: LandingFeaturedProduct[];
  whatsappUrl: string;
}

function buildWhatsAppHref(whatsappUrl: string, productName: string) {
  const text = encodeURIComponent(
    `Hola PLASTICOS LA 16, quiero cotizar ${productName}.`,
  );
  if (whatsappUrl.includes("?")) {
    return `${whatsappUrl}&text=${text}`;
  }
  return `${whatsappUrl}?text=${text}`;
}

function FeaturedCard({
  product,
  whatsappUrl,
  themeIndex,
}: {
  product: LandingFeaturedProduct;
  whatsappUrl: string;
  themeIndex: number;
}) {
  const href = buildWhatsAppHref(whatsappUrl, product.name);
  const theme = FEATURED_CARD_THEMES[themeIndex % FEATURED_CARD_THEMES.length];

  return (
    <article
      className={cn(
        "group relative h-[22rem] w-[13rem] shrink-0 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/85 sm:h-[26rem] sm:w-[15rem] md:w-[16rem]",
        "transition duration-300 hover:-translate-y-1 hover:border-blue-400/60",
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-80",
            theme,
          )}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]" />
      </div>

      <div className="relative z-[1] flex h-full min-h-0 flex-col">
        {/*
          El img debe llenar un bloque con tamaño definido: en flex, solo max-w/max-h
          deja el item en tamaño intrínseco (iconos quedan minúsculos). h-full w-full
          + object-contain escala el bitmap dentro de todo el hueco de la tarjeta.
        */}
        <div className="flex min-h-0 flex-1 px-1.5 pb-2 pt-3 sm:px-2 sm:pb-2.5 sm:pt-4">
          <div className="relative min-h-0 w-full flex-1">
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full min-h-0 object-contain object-center drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] translate-y-full bg-gradient-to-t from-black via-black/92 to-transparent px-4 pb-5 pt-20 transition duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0">
        {product.category_name ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
            {product.category_name}
          </p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">
          {product.presentation}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 sm:text-sm"
        >
          Cotizar por WhatsApp
        </a>
      </div>
    </article>
  );
}

export function FeaturedProductsMarquee({
  products,
  whatsappUrl,
}: FeaturedProductsMarqueeProps) {
  if (products.length === 0) return null;

  const minSlots = 10;
  const repeated =
    products.length >= minSlots
      ? products
      : Array.from({ length: Math.ceil(minSlots / products.length) }, () => products).flat();
  const loop = [...repeated, ...repeated];
  const durationSec = Math.min(55, Math.max(24, repeated.length * 5));

  return (
    <ScrollFadeSection
      id="destacados"
      className="scroll-mt-28 overflow-x-hidden bg-transparent py-16 sm:py-20"
    >
      <div className={LANDING_PAGE_GUTTER}>
        <div className={cn(LANDING_SECTION_PANEL, "overflow-hidden")}>
          <div className={cn(LANDING_SECTION_PANEL_PAD, "pb-4")}>
            <PublicSectionHeading>Productos destacados</PublicSectionHeading>
            <p className="mt-3 max-w-2xl text-zinc-300/95 [text-shadow:0_1px_18px_rgba(0,0,0,0.65)]">
              Referencias seleccionadas. Pasa el cursor para ver detalle y cotizar por
              WhatsApp.
            </p>
          </div>

          <div className="relative overflow-x-hidden px-1 pb-6 sm:px-2 sm:pb-8">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[clamp(2.5rem,8vw,5rem)] bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[clamp(2.5rem,8vw,5rem)] bg-gradient-to-l from-zinc-900 via-zinc-900/90 to-transparent"
              aria-hidden
            />
            <div
              className="supplier-marquee-inner gap-5 px-1 sm:gap-6 sm:px-2"
              style={
                { "--supplier-marquee-duration": `${durationSec}s` } as CSSProperties
              }
            >
              {loop.map((product, index) => (
                <FeaturedCard
                  key={`${product.id}-${index}`}
                  product={product}
                  whatsappUrl={whatsappUrl}
                  themeIndex={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  );
}
