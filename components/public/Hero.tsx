"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award, LayoutGrid, RefreshCw, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
} from "@/components/public/landing-section-styles";
import { PublicSectionBar } from "@/components/public/PublicSectionHeading";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";

const FALLBACK_WORDS = ["Plásticos", "Vasos", "Empaques", "Bolsas"] as const;

const HERO_HIGHLIGHTS: {
  icon: LucideIcon;
  /** Número o marca corta en gradiente (opcional). */
  stat?: string;
  /** Etiqueta editorial breve encima del titular. */
  tag: string;
  headline: string;
  description: string;
}[] = [
  {
    icon: Award,
    stat: "+30",
    tag: "Trayectoria",
    headline: "años en el mercado",
    description: "Trayectoria y confianza en Florencia y la región.",
  },
  {
    icon: LayoutGrid,
    tag: "Catálogo",
    headline: "Variedad en productos",
    description: "Empaques, vasos, bolsas y soluciones para tu negocio.",
  },
  {
    icon: RefreshCw,
    tag: "Operación",
    headline: "Stock en tiempo real",
    description: "Inventario sincronizado para mayoristas y detallistas.",
  },
];

function HeroHighlightRail() {
  return (
    <div className="relative w-full max-w-5xl" aria-label="Ventajas principales">
      {/* Línea guía — escritorio: cruza bajo los nodos */}
      <div
        className="pointer-events-none absolute left-[6%] right-[6%] top-[1.375rem] z-0 hidden h-px sm:block"
        aria-hidden
      >
        <div className="h-full w-full bg-gradient-to-r from-blue-500/0 via-white/35 to-blue-500/0 opacity-80" />
        <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent blur-[2px]" />
      </div>

      <ul className="relative z-[1] flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between sm:gap-3 md:gap-6">
        {HERO_HIGHLIGHTS.map(({ icon: Icon, stat, tag, headline, description }, index) => (
          <motion.li
            key={headline}
            role="listitem"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 * index }}
            className={cn(
              "group relative flex gap-4 sm:w-[min(100%,11.5rem)] sm:flex-none sm:flex-col sm:items-center sm:gap-0 sm:text-center md:w-auto md:max-w-[13rem]",
              "sm:pt-0",
            )}
          >
            {/* Acento móvil: franja vertical en lugar de caja */}
            <span
              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-blue-400 via-white/40 to-cyan-400/80 opacity-90 sm:hidden"
              aria-hidden
            />

            <div className="relative flex min-w-0 flex-1 flex-col pl-3 sm:items-center sm:pl-0">
              {/* Nodo: anillo + brillo (no tarjeta) */}
              <div className="relative shrink-0 sm:mx-auto">
                <div
                  className="absolute -inset-3 rounded-full bg-gradient-to-br from-blue-500/25 via-transparent to-cyan-400/20 opacity-70 blur-lg transition duration-500 group-hover:opacity-100 group-hover:blur-xl"
                  aria-hidden
                />
                <div
                  className={cn(
                    "relative grid size-[2.75rem] place-items-center rounded-full border-2 border-white/25 bg-zinc-950/80 shadow-[0_0_0_6px_rgba(0,0,0,0.45)]",
                    "transition duration-300 group-hover:border-blue-400/55 group-hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]",
                    "sm:size-[3.25rem]",
                  )}
                  aria-hidden
                >
                  <Icon className="size-[1.05rem] text-blue-300 sm:size-[1.2rem]" strokeWidth={1.75} />
                </div>
              </div>

              <div className="mt-3 min-w-0 sm:mt-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-blue-300/85 sm:text-[0.68rem]">
                  {tag}
                </p>
                <p className="mt-1.5 font-semibold leading-snug tracking-tight text-white sm:mt-2">
                  {stat ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                      <span className="bg-gradient-to-br from-white via-blue-100 to-cyan-200 bg-clip-text text-2xl font-black tabular-nums text-transparent sm:text-3xl">
                        {stat}
                      </span>
                      <span className="text-[0.95rem] sm:text-base">{headline}</span>
                    </span>
                  ) : (
                    <span className="text-[0.95rem] sm:text-base">{headline}</span>
                  )}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:mt-2 sm:text-[0.8125rem]">
                  {description}
                </p>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

interface HeroProps {
  rotatingWords?: string[];
  /** Eslogan sobre el video (overlay); si viene vacío no se muestra. */
  slogan?: string;
}

export function Hero({ rotatingWords = [], slogan }: HeroProps) {
  const filteredWords = rotatingWords.filter((word) => word.trim().length > 0);
  const words = filteredWords.length > 0 ? filteredWords : [...FALLBACK_WORDS];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;

    const interval = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [words.length]);

  return (
    <ScrollFadeSection
      id="inicio"
      className="relative scroll-mt-28 bg-transparent pt-6 pb-8 sm:pt-8 sm:pb-10"
      aria-labelledby="hero-heading"
    >
      <div className={LANDING_PAGE_GUTTER}>
        <div
          className={cn(
            LANDING_SECTION_PANEL,
            "overflow-hidden",
          )}
        >
          {/* Altura generosa; el bloque sigue bajo el navbar en el flujo (z-50 en header). */}
          <div className="relative h-[min(72vh,640px)] min-h-[360px] w-full sm:h-[min(76vh,720px)] sm:min-h-[400px] md:h-[min(82vh,820px)] md:min-h-[440px] lg:h-[min(85vh,920px)]">
            <video
              className="absolute inset-0 z-0 h-full w-full object-cover"
              src="/hero-video.mp4"
              autoPlay
              loop
              muted
              playsInline
            />

            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-transparent to-black/40"
              aria-hidden
            />
            {/* Refuerzo inferior para legibilidad de las tarjetas glass */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[42%] bg-gradient-to-t from-black/75 via-black/35 to-transparent sm:h-[38%]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_100%_55%_at_50%_-15%,rgba(37,99,235,0.14),transparent_52%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_55%_35%_at_100%_70%,rgba(59,130,246,0.07),transparent_50%)]"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/80 to-black/40" />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-4 pt-12 sm:px-5 sm:pb-5 sm:pt-12 md:px-6 md:pb-6 md:pt-10"
            >
              <div className="flex min-h-0 flex-1 flex-col justify-end md:justify-center md:pb-2">
              <div className="max-w-3xl">
                {slogan?.trim() ? (
                  <motion.figure
                    id="hero-slogan"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
                    className="mb-4 max-w-2xl sm:mb-5"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <PublicSectionBar className="mt-1.5 h-[2.5rem] sm:h-[3rem]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-blue-400/90 sm:text-[0.7rem]">
                          Plásticos La 16
                        </p>
                        <blockquote className="relative mt-2 border-none p-0">
                          <span
                            className="pointer-events-none absolute -left-1 -top-3 font-serif text-5xl leading-none text-blue-500/45 sm:-top-4 sm:text-6xl"
                            aria-hidden
                          >
                            “
                          </span>
                          <p className="relative z-10 pl-3 font-serif text-base font-medium italic leading-relaxed tracking-wide text-zinc-50 [text-shadow:0_2px_24px_rgba(0,0,0,0.92)] sm:pl-4 sm:text-lg md:text-xl">
                            {slogan.trim()}
                            <span className="whitespace-nowrap font-serif not-italic text-blue-400/90">
                              ”
                            </span>
                          </p>
                        </blockquote>
                        <div
                          className="mt-2 flex items-center gap-2 sm:mt-3"
                          aria-hidden
                        >
                          <span className="h-px w-12 bg-gradient-to-r from-blue-500 to-blue-500/0 sm:w-16" />
                          <span className="size-1 rounded-full bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.7)]" />
                        </div>
                      </div>
                    </div>
                  </motion.figure>
                ) : null}

                <div className="flex items-start gap-3 sm:gap-4">
                  <PublicSectionBar className="mt-1.5 h-11 sm:mt-2 sm:h-14 md:h-16" />
                  <h1
                    id="hero-heading"
                    aria-describedby={slogan?.trim() ? "hero-slogan" : undefined}
                    className="min-w-0 flex-1 text-3xl font-bold uppercase leading-tight tracking-tight text-white sm:text-4xl md:text-5xl"
                  >
                    LA SOLUCIÓN INTEGRAL EN{" "}
                    <span className="relative inline-flex min-w-[160px] align-baseline sm:min-w-[200px]">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={words[wordIndex]}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -18 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          className="py-1 text-blue-600"
                        >
                          {words[wordIndex].toUpperCase()}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </h1>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
                  DISTRIBUCION MAYORISTA Y DETALLADO CON INVENTARIO SINCRONIZADO EN
                  TIEMPO REAL DESDE FLORENCIA.
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                  className="mt-5 flex flex-wrap gap-3 sm:mt-6"
                >
                  <a
                    href="#catalogo"
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 sm:px-6 sm:py-3"
                  >
                    Catálogo
                  </a>
                  <a
                    href="#ubicacion"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-6 sm:py-3"
                  >
                    Contacto
                  </a>
                </motion.div>
              </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: "easeOut", delay: 0.2 }}
                className="relative z-10 mt-5 shrink-0 sm:mt-6"
              >
                <HeroHighlightRail />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  );
}
