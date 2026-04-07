"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  HeartHandshake,
  LayoutGrid,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
  LANDING_SECTION_PANEL_PAD,
} from "@/components/public/landing-section-styles";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const ABOUT_PILLARS: {
  icon: LucideIcon;
  tag: string;
  headline: string;
  description: string;
}[] = [
  {
    icon: LayoutGrid,
    tag: "Surtido",
    headline: "Variedad sin competencia",
    description:
      "El catálogo más completo de empaques y desechables, seleccionado para cubrir todas tus necesidades en un solo lugar.",
  },
  {
    icon: HeartHandshake,
    tag: "Cercanía",
    headline: "Atención que conoce su oficio",
    description:
      "La cercanía y honestidad de siempre, brindada por un equipo que conoce a fondo cada producto.",
  },
  {
    icon: Truck,
    tag: "Domicilio",
    headline: "Agilidad en tu puerta",
    description:
      "Un servicio de domicilio rápido y eficiente, diseñado para que tu inventario nunca se detenga.",
  },
];

function AboutPillarsRail({
  active,
}: {
  active: boolean;
}) {
  return (
    <motion.div
      className="relative w-full"
      variants={containerVariants}
      initial="hidden"
      animate={active ? "show" : "hidden"}
      role="region"
      aria-label="Tres pilares fundamentales"
    >
      <div
        className="pointer-events-none absolute left-[6%] right-[6%] top-[1.375rem] z-0 hidden h-px sm:block"
        aria-hidden
      >
        <div className="h-full w-full bg-gradient-to-r from-amber-500/0 via-white/30 to-blue-500/0 opacity-85" />
        <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-blue-300/20 to-transparent blur-[2px]" />
      </div>

      <ul className="relative z-[1] flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between sm:gap-4 md:gap-6">
        {ABOUT_PILLARS.map(({ icon: Icon, tag, headline, description }) => (
          <motion.li
            key={headline}
            role="listitem"
            variants={itemVariants}
            className={cn(
              "group relative flex gap-4 sm:w-[min(100%,11.5rem)] sm:flex-none sm:flex-col sm:items-center sm:gap-0 sm:text-center md:w-auto md:max-w-[14rem]",
            )}
          >
            <span
              className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-amber-400/90 via-white/35 to-blue-400/80 opacity-90 sm:hidden"
              aria-hidden
            />

            <div className="relative flex min-w-0 flex-1 flex-col pl-3 sm:items-center sm:pl-0">
              <div className="relative shrink-0 sm:mx-auto">
                <div
                  className="absolute -inset-3 rounded-full bg-gradient-to-br from-amber-500/20 via-transparent to-blue-500/25 opacity-70 blur-lg transition duration-500 group-hover:opacity-100 group-hover:blur-xl"
                  aria-hidden
                />
                <div
                  className={cn(
                    "relative grid size-[2.75rem] place-items-center rounded-full border-2 border-white/25 bg-zinc-950/85 shadow-[0_0_0_6px_rgba(9,9,11,0.65)]",
                    "transition duration-300 group-hover:border-blue-400/50 group-hover:shadow-[0_0_26px_rgba(59,130,246,0.28)]",
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
                <p className="mt-1.5 text-[0.95rem] font-semibold leading-snug tracking-tight text-white sm:mt-2 sm:text-base">
                  {headline}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:mt-2 sm:text-[0.8125rem]">
                  {description}
                </p>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

const DEFAULT_HERITAGE_SRC = "/about-florencia-historica.png";
const DEFAULT_STOREFRONT_SRC = "/about-local-fachada-noche.png";

export interface AboutSectionProps {
  /** Imagen histórica (Florencia / contexto local). Por defecto `public/about-florencia-historica.png`. */
  heritageImageSrc?: string | null;
  heritageImageAlt?: string;
  /** Fachada o local actual. Por defecto `public/about-local-fachada-noche.png`. */
  storefrontImageSrc?: string | null;
  storefrontImageAlt?: string;
  className?: string;
}

export function AboutSection({
  heritageImageSrc = DEFAULT_HERITAGE_SRC,
  heritageImageAlt =
    "Florencia — imagen de archivo con la historia de la ciudad",
  storefrontImageSrc = DEFAULT_STOREFRONT_SRC,
  storefrontImageAlt =
    "Fachada iluminada de Plásticos La 16 en la calle 16, de noche",
  className,
}: AboutSectionProps) {
  const reduceMotion = useReducedMotion();
  const pillarsRef = useRef<HTMLDivElement | null>(null);
  const pillarsInView = useInView(pillarsRef, {
    once: true,
    margin: "-48px 0px",
  });
  const pillarsActive = reduceMotion === true || pillarsInView;

  return (
    <ScrollFadeSection
      id="quienes-somos"
      className={cn(
        "relative scroll-mt-28 bg-transparent py-20 sm:py-24",
        className,
      )}
      aria-labelledby="about-section-title"
    >
      <div className={LANDING_PAGE_GUTTER}>
        <div
          className={cn(LANDING_SECTION_PANEL, LANDING_SECTION_PANEL_PAD)}
        >
          <div className="flex flex-col gap-14 lg:gap-[4.5rem]">
            {/* Titular: aire propio, no compite con la columna de fotos */}
            <header className="max-w-3xl">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-blue-400/90">
                Quiénes somos
              </p>
              <h2
                id="about-section-title"
                className="mt-3 text-2xl font-bold leading-[1.15] tracking-tight text-white sm:mt-4 sm:text-3xl sm:leading-[1.12] md:text-4xl md:leading-[1.1]"
              >
                Más de 30 años creciendo contigo
              </h2>
            </header>

            {/* Historia (lectura) + contexto visual */}
            <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div className="max-w-prose space-y-6">
              <p className="text-base leading-[1.75] text-zinc-300 sm:text-lg sm:leading-[1.7]">
                En <strong className="font-semibold text-zinc-100">Plásticos La 16</strong>{" "}
                somos parte del corazón comercial de Florencia. Fuimos los primeros en
                introducir la comercialización de plásticos y desechables en la ciudad,
                estableciéndonos hace más de 30 años en nuestra emblemática esquina de la{" "}
                <strong className="font-medium text-zinc-200">Galería Central</strong>.
              </p>
              <p className="text-base leading-[1.75] text-zinc-300 sm:text-lg sm:leading-[1.7]">
                Lo que comenzó como un sueño pionero, hoy es una empresa familiar que ha
                crecido de generación en generación, evolucionando junto a cada negocio y
                hogar de la región.
              </p>
              <p className="border-l-2 border-blue-500/35 pl-5 text-sm leading-[1.75] text-zinc-400 sm:text-base sm:leading-[1.7]">
                Nuestra trayectoria nos permite entender que la clave del éxito no solo
                está en la experiencia, sino en el{" "}
                <strong className="font-medium text-zinc-300">
                  compromiso diario con nuestros clientes
                </strong>
                .
              </p>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                  Ayer y hoy
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  La misma ciudad, otro ritmo: archivo de una Florencia de hace
                  casi medio siglo y nuestra fachada de hoy en la 16, con la luz
                  que nos identifica en la noche.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {heritageImageSrc?.trim() ? (
                  <figure className="group rounded-2xl border border-amber-900/40 bg-zinc-950 ring-1 ring-amber-950/25 transition-colors duration-300 ease-out hover:border-amber-800/55">
                    <div className="relative aspect-video overflow-hidden rounded-2xl">
                      <Image
                        src={heritageImageSrc.trim()}
                        alt={heritageImageAlt}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        priority={false}
                      />
                      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10">
                        <span className="font-serif text-[0.7rem] font-medium uppercase tracking-[0.18em] text-amber-100/90">
                          Florencia
                        </span>
                        <p className="mt-0.5 text-xs font-medium text-zinc-200">
                          Archivo · hace casi 50 años
                        </p>
                      </figcaption>
                    </div>
                  </figure>
                ) : null}

                {storefrontImageSrc?.trim() ? (
                  <figure className="group rounded-2xl border border-blue-500/40 bg-zinc-950 ring-1 ring-blue-500/20 transition-colors duration-300 ease-out hover:border-blue-400/55">
                    <div className="relative aspect-video overflow-hidden rounded-2xl">
                      <Image
                        src={storefrontImageSrc.trim()}
                        alt={storefrontImageAlt}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        priority={false}
                      />
                      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-12">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-300">
                          Plásticos La 16
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-zinc-300">
                          Fachada actual · reconocé el local de noche
                        </p>
                      </figcaption>
                    </div>
                  </figure>
                ) : null}
              </div>

              {!heritageImageSrc?.trim() && !storefrontImageSrc?.trim() ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
                  <Store
                    className="size-14 text-zinc-600"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <p className="mt-5 text-sm font-medium text-zinc-300">
                    Galería La Concordia
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Cl. 16 #14 esquina, Local 45 · Florencia, Caquetá
                  </p>
                  <Link
                    href="#ubicacion"
                    className="mt-6 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
                  >
                    Ver ubicación y mapa
                  </Link>
                </div>
              ) : (
                <Link
                  href="#ubicacion"
                  className="inline-flex text-sm font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Cómo llegar al local →
                </Link>
              )}
            </aside>
            </div>

            {/* Pilares: capítulo visual aparte */}
            <section
              ref={pillarsRef}
              className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-950/90 via-zinc-950/50 to-zinc-950/30 px-5 py-12 sm:rounded-3xl sm:px-8 sm:py-14 lg:px-12 lg:py-16"
              aria-labelledby="about-pillars-heading"
            >
              <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-blue-400/85">
                  Cómo trabajamos
                </p>
                <h3
                  id="about-pillars-heading"
                  className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl"
                >
                  Tres pilares que nos distinguen
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                  Más allá de la experiencia, lo que nos define es el compromiso diario con
                  quienes confían en nosotros.
                </p>
              </div>
              <AboutPillarsRail active={pillarsActive} />
            </section>
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  );
}
