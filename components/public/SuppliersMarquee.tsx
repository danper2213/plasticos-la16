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

export interface PublicSupplier {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

interface SuppliersMarqueeProps {
  suppliers: PublicSupplier[];
}

function SupplierCard({ supplier }: { supplier: PublicSupplier }) {
  const content = (
    <article className="flex h-24 w-44 shrink-0 items-center justify-center px-2 md:h-28 md:w-52">
      {supplier.logo_url ? (
        <img
          src={supplier.logo_url}
          alt={supplier.name}
          className="max-h-14 max-w-[10rem] object-contain opacity-90 transition duration-300 hover:opacity-100 md:max-h-16 md:max-w-[11rem]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <p className="text-center text-sm font-semibold tracking-tight text-zinc-300">
          {supplier.name}
        </p>
      )}
    </article>
  );

  if (supplier.website_url) {
    return (
      <a
        href={supplier.website_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={supplier.name}
      >
        {content}
      </a>
    );
  }

  return content;
}

export function SuppliersMarquee({ suppliers }: SuppliersMarqueeProps) {
  if (suppliers.length === 0) return null;

  // Repetir la lista si hay pocos ítems para que el carril sea ancho y el deslizamiento se note.
  const minSlots = 10;
  const repeated =
    suppliers.length >= minSlots
      ? suppliers
      : Array.from({ length: Math.ceil(minSlots / suppliers.length) }, () => suppliers).flat();
  const loopSuppliers = [...repeated, ...repeated];

  // Más logos → ciclo un poco más largo para que no vaya demasiado rápido.
  const durationSec = Math.min(55, Math.max(22, repeated.length * 4));

  return (
    <ScrollFadeSection
      id="proveedores"
      className="relative scroll-mt-28 overflow-x-hidden bg-transparent py-16 sm:py-20"
    >
      <div className={LANDING_PAGE_GUTTER}>
        <div className={cn(LANDING_SECTION_PANEL, "overflow-hidden")}>
          <div className={cn(LANDING_SECTION_PANEL_PAD, "pb-4")}>
            <PublicSectionHeading>
              Marcas y proveedores aliados
            </PublicSectionHeading>
            <p className="mt-3 text-zinc-400">
              Trabajamos con aliados clave para mantener surtido constante y calidad.
            </p>
          </div>

          <div className="relative overflow-x-hidden px-1 pb-6 sm:px-2 sm:pb-8">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[clamp(2.5rem,8vw,5rem)] bg-gradient-to-r from-zinc-900 via-zinc-900/85 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[clamp(2.5rem,8vw,5rem)] bg-gradient-to-l from-zinc-900 via-zinc-900/85 to-transparent"
              aria-hidden
            />
            <div
              className="supplier-marquee-inner"
              style={{ "--supplier-marquee-duration": `${durationSec}s` } as CSSProperties}
            >
              {loopSuppliers.map((supplier, index) => (
                <SupplierCard key={`${supplier.id}-${index}`} supplier={supplier} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  );
}
