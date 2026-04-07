"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PublicSectionBar,
  PublicSectionHeading,
} from "@/components/public/PublicSectionHeading";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
  LANDING_SECTION_PANEL_PAD,
} from "@/components/public/landing-section-styles";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";

export interface PublicCatalogItem {
  id: string;
  name: string;
  presentation: string;
  category_name: string;
  stock_quantity: number | null;
}

interface CatalogPreviewProps {
  products: PublicCatalogItem[];
  whatsappUrl: string;
}

const PRODUCTS_PER_PAGE = 3;

export function CatalogPreview({ products, whatsappUrl }: CatalogPreviewProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>("");
  const [pageIndex, setPageIndex] = React.useState(0);
  const [productsPageIndex, setProductsPageIndex] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const pageSize = 4;

  const categories = React.useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category_name)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [products]
  );

  React.useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0]);
    }
    if (activeCategory && !categories.includes(activeCategory) && categories.length > 0) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  React.useEffect(() => {
    setProductsPageIndex(0);
  }, [activeCategory]);

  const maxPage = Math.max(0, Math.ceil(categories.length / pageSize) - 1);
  const visibleCategories = categories.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  const selectedProducts = React.useMemo(
    () => products.filter((item) => item.category_name === activeCategory),
    [products, activeCategory]
  );

  function getWhatsAppHref(productName: string) {
    const text = encodeURIComponent(
      `Hola PLASTICOS LA 16, quiero cotizar ${productName}.`
    );
    if (whatsappUrl.includes("?")) {
      return `${whatsappUrl}&text=${text}`;
    }
    return `${whatsappUrl}?text=${text}`;
  }

  function handlePrev() {
    if (maxPage === 0) return;
    setDirection(-1);
    setPageIndex((prev) => (prev === 0 ? maxPage : prev - 1));
  }

  function handleNext() {
    if (maxPage === 0) return;
    setDirection(1);
    setPageIndex((prev) => (prev === maxPage ? 0 : prev + 1));
  }

  const totalProducts = selectedProducts.length;
  const productPageCount = Math.max(
    1,
    Math.ceil(totalProducts / PRODUCTS_PER_PAGE),
  );
  const safeProductPage = Math.min(productsPageIndex, productPageCount - 1);
  const paginatedProducts =
    totalProducts <= PRODUCTS_PER_PAGE
      ? selectedProducts
      : selectedProducts.slice(
          safeProductPage * PRODUCTS_PER_PAGE,
          safeProductPage * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE,
        );
  const productRangeStart =
    totalProducts === 0 ? 0 : safeProductPage * PRODUCTS_PER_PAGE + 1;
  const productRangeEnd = Math.min(
    (safeProductPage + 1) * PRODUCTS_PER_PAGE,
    totalProducts,
  );
  const showProductPagination = totalProducts > PRODUCTS_PER_PAGE;

  React.useEffect(() => {
    setProductsPageIndex((p) =>
      Math.min(p, Math.max(0, productPageCount - 1)),
    );
  }, [productPageCount]);

  const cardRotations = [-8, -3, 3, 8] as const;
  const cardThemes = [
    "from-blue-500/30 to-cyan-500/20",
    "from-purple-500/30 to-blue-500/20",
    "from-emerald-500/30 to-teal-500/20",
    "from-orange-500/30 to-rose-500/20",
  ] as const;

  return (
    <ScrollFadeSection
      id="catalogo"
      className="relative scroll-mt-28 bg-transparent py-16 sm:py-20"
    >
      <div className={LANDING_PAGE_GUTTER}>
      <div
        className={cn(LANDING_SECTION_PANEL, LANDING_SECTION_PANEL_PAD)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <PublicSectionHeading size="compact">
              Catálogo por categorías
            </PublicSectionHeading>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Descubre líneas de producto en tarjetas interactivas y selecciona una
              categoría para ver referencias destacadas.
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handlePrev}
              className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/70 text-zinc-300 transition hover:border-blue-500 hover:text-white"
              aria-label="Ver categorías anteriores"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="size-4" />
            </motion.button>
            <motion.button
              type="button"
              onClick={handleNext}
              className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/70 text-zinc-300 transition hover:border-blue-500 hover:text-white"
              aria-label="Ver más categorías"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="size-4" />
            </motion.button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-400">
            Pronto agregaremos categorías para explorar.
          </div>
        ) : (
          <>
            {/* overflow-visible: las cards rotadas sobresalen; overflow-hidden las cortaba abajo */}
            <div className="mt-6 min-h-[280px] overflow-visible px-1 pb-10 pt-4 md:min-h-[300px] md:pb-14 md:pt-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pageIndex}
                  initial={{ opacity: 0, x: direction * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -30 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col gap-4 md:flex-row md:items-end md:justify-center md:pt-2"
                >
                  {visibleCategories.map((category, index) => {
                    const productsForCategory = products.filter(
                      (item) => item.category_name === category
                    );
                    const rotation = cardRotations[index % cardRotations.length];
                    const theme = cardThemes[index % cardThemes.length];
                    return (
                      <motion.button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          "group relative min-h-[230px] overflow-hidden rounded-[2rem] border bg-zinc-950/85 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-xl hover:shadow-blue-500/15",
                          "md:w-[250px] md:-ml-9 first:md:ml-0",
                          activeCategory === category
                            ? "z-20 scale-[1.02] border-blue-500 bg-blue-500/10"
                            : "border-zinc-800"
                        )}
                        style={{ transform: `rotate(${rotation}deg)` }}
                        whileHover={{ y: -6, scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                      >
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                            theme
                          )}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]" />
                        <div className="flex items-start justify-between gap-3">
                          <p className="relative z-10 text-2xl font-bold leading-tight text-zinc-100">
                            {category}
                          </p>
                          <Sparkles className="relative z-10 size-4 text-blue-300" />
                        </div>
                        <p className="relative z-10 mt-6 text-base font-medium text-zinc-200">
                          {productsForCategory.length} referencias
                        </p>
                        <p className="relative z-10 mt-6 text-xs uppercase tracking-[0.22em] text-zinc-100/90">
                          Ver productos
                        </p>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <PublicSectionBar className="mt-1 h-9 sm:h-10" />
                    <div className="min-w-0">
                      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                        Categoría seleccionada
                      </p>
                      <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-100">
                        {activeCategory}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">{totalProducts} referencias</p>
                </motion.div>
              </AnimatePresence>

              {selectedProducts.length === 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
                  Esta categoría aún no tiene productos publicados.
                </div>
              ) : (
                <>
                  <motion.div
                    key={`${activeCategory}-products-${safeProductPage}`}
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.08, delayChildren: 0.03 } },
                    }}
                    className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {paginatedProducts.map((item, index) => (
                      <motion.article
                        key={item.id}
                        variants={{
                          hidden: { opacity: 0, y: 12 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
                        }}
                        className="group relative flex min-h-[210px] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10"
                      >
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70",
                            cardThemes[
                              (safeProductPage * PRODUCTS_PER_PAGE + index) %
                                cardThemes.length
                            ]
                          )}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_55%)]" />
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="relative z-10 text-lg font-bold leading-tight text-zinc-100">
                            {item.name}
                          </h4>
                        </div>
                        <p className="relative z-10 mt-3 text-sm text-zinc-200/85">
                          {item.presentation}
                        </p>
                        <a
                          href={getWhatsAppHref(item.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-10 mt-auto inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          Cotizar por WhatsApp
                        </a>
                      </motion.article>
                    ))}
                  </motion.div>

                  {showProductPagination ? (
                    <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 pt-5 sm:flex-row">
                      <p className="text-sm text-zinc-400">
                        Mostrando{" "}
                        <span className="font-medium text-zinc-200">
                          {productRangeStart}–{productRangeEnd}
                        </span>{" "}
                        de{" "}
                        <span className="font-medium text-zinc-200">{totalProducts}</span>
                        <span className="mx-2 text-zinc-600">·</span>
                        Página{" "}
                        <span className="font-medium text-zinc-200">
                          {safeProductPage + 1}
                        </span>{" "}
                        de {productPageCount}
                      </p>
                      <div className="inline-flex items-center gap-2">
                        <motion.button
                          type="button"
                          disabled={safeProductPage <= 0}
                          onClick={() =>
                            setProductsPageIndex((p) => Math.max(0, p - 1))
                          }
                          className={cn(
                            "inline-flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/70 text-zinc-300 transition hover:border-blue-500 hover:text-white",
                            safeProductPage <= 0 &&
                              "pointer-events-none opacity-40 hover:border-zinc-700 hover:text-zinc-300",
                          )}
                          aria-label="Productos anteriores"
                          whileHover={safeProductPage > 0 ? { scale: 1.05 } : undefined}
                          whileTap={safeProductPage > 0 ? { scale: 0.95 } : undefined}
                        >
                          <ChevronLeft className="size-4" />
                        </motion.button>
                        <motion.button
                          type="button"
                          disabled={safeProductPage >= productPageCount - 1}
                          onClick={() =>
                            setProductsPageIndex((p) =>
                              Math.min(productPageCount - 1, p + 1),
                            )
                          }
                          className={cn(
                            "inline-flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/70 text-zinc-300 transition hover:border-blue-500 hover:text-white",
                            safeProductPage >= productPageCount - 1 &&
                              "pointer-events-none opacity-40 hover:border-zinc-700 hover:text-zinc-300",
                          )}
                          aria-label="Siguientes productos"
                          whileHover={
                            safeProductPage < productPageCount - 1
                              ? { scale: 1.05 }
                              : undefined
                          }
                          whileTap={
                            safeProductPage < productPageCount - 1
                              ? { scale: 0.95 }
                              : undefined
                          }
                        >
                          <ChevronRight className="size-4" />
                        </motion.button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </ScrollFadeSection>
  );
}
