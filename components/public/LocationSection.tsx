"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPinned, MessageCircle, Navigation } from "lucide-react";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";

const BOGOTA_TZ = "America/Bogota";

/** Mismo padding horizontal que `LANDING_PAGE_GUTTER`; ancho máximo pedido para esta sección. */
const SECTION_FRAME =
  "mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-5";

const STORE_MAP_EMBED =
  "https://maps.google.com/maps?q=Pl%C3%A1sticos%20la%2016%2C%20Galeria%20La%20Concordia%2C%20Cl%2016%20%2314%20Esquina%20Local%2045%2C%20Florencia%2C%20Caquet%C3%A1&t=&z=17&ie=UTF8&iwloc=&output=embed";

const STORE_MAP_SEARCH =
  "https://www.google.com/maps/search/?api=1&query=Pl%C3%A1sticos%20la%2016%2C%20Galeria%20La%20Concordia%2C%20Cl%2016%20%2314%20Esquina%20Local%2045%2C%20Florencia%2C%20Caquet%C3%A1";

const STORE_DIRECTIONS =
  "https://www.google.com/maps/dir/?api=1&destination=Pl%C3%A1sticos%20la%2016%2C%20Galeria%20La%20Concordia%2C%20Cl%2016%20%2314%20Esquina%20Local%2045%2C%20Florencia%2C%20Caquet%C3%A1";

const WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent(
  "Plásticos La 16, Galería La Concordia, Cl 16 #14 Local 45, Florencia, Caquetá",
)}&navigate=yes`;

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getBogotaDayAndMinutes(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const day = WEEKDAY_TO_INDEX[wd] ?? 0;
  return { day, minutes: hour * 60 + minute };
}

/** Coherente con `HOURS_ROWS`: lun–sáb 7:00–18:00; domingo y festivos 7:00–12:00 (festivos no detectados). */
function isStoreOpenNow(date: Date): boolean {
  const { day, minutes } = getBogotaDayAndMinutes(date);
  const open = 7 * 60;
  if (day === 0) {
    return minutes >= open && minutes < 12 * 60;
  }
  return minutes >= open && minutes < 18 * 60;
}

function buildWhatsAppLocationHref(baseUrl?: string | null): string {
  const text = encodeURIComponent(
    "Hola, necesito indicaciones para llegar a Plásticos La 16 en la Galería La Concordia (Cl. 16 #14, Local 45, Florencia).",
  );
  const trimmed = baseUrl?.trim();
  if (trimmed) {
    return trimmed.includes("?")
      ? `${trimmed}&text=${text}`
      : `${trimmed}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

const HOURS_ROWS: { label: string; hours: string }[] = [
  { label: "Lunes – Sabados", hours: "7:00 a. m. – 6:00 p. m." },
  { label: "Domingo - festivos", hours: "7:00 a. m. – 12:00 p. m." }
];

export interface LocationSectionProps {
  whatsappUrl?: string | null;
  /** Punto de interés para el texto de referencia (ej. parque o centro comercial). */
  nearbyLandmark?: string;
  className?: string;
}

export function LocationSection({
  whatsappUrl,
  nearbyLandmark = "la Galería La Concordia y el corredor comercial del centro de Florencia",
  className,
}: LocationSectionProps) {
  const [openStatus, setOpenStatus] = useState<"unknown" | "open" | "closed">(
    "unknown",
  );

  const whatsHref = useMemo(
    () => buildWhatsAppLocationHref(whatsappUrl),
    [whatsappUrl],
  );

  useEffect(() => {
    const tick = () => {
      setOpenStatus(isStoreOpenNow(new Date()) ? "open" : "closed");
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ScrollFadeSection
      id="ubicacion"
      className={cn(
        "relative scroll-mt-28 bg-transparent py-16 sm:py-20",
        className,
      )}
      aria-labelledby="location-section-title"
    >
      <div className={SECTION_FRAME}>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-stretch">
          {/* Mapa */}
          <div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-lg lg:min-h-[min(520px,55vh)]">
            <iframe
              title="Mapa de Plásticos La 16"
              src={STORE_MAP_EMBED}
              className="absolute inset-0 h-full w-full border-0 [filter:invert(90%)_hue-rotate(180deg)_saturate(0.7)_contrast(1.06)]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          {/* Panel información estilo dashboard */}
          <div className="flex flex-col justify-between gap-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-blue-400/90">
                  Ubicación
                </p>
                <h2
                  id="location-section-title"
                  className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl"
                >
                  Visítanos en el corazón de Florencia
                </h2>
              </div>

              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Dirección
                </p>
                <address className="mt-2 not-italic">
                  <p className="text-lg font-semibold leading-snug text-zinc-100 sm:text-xl">
                    Galería La Concordia
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-zinc-300 sm:text-lg">
                    Cl. 16 #14 esquina, Local 45
                  </p>
                  <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                    Florencia, Caquetá — Colombia
                  </p>
                </address>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Horarios
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2.5 py-0.5 text-[0.7rem] font-medium text-zinc-300"
                    title="Según hora en Colombia (America/Bogota)"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        openStatus === "unknown" && "animate-pulse bg-zinc-500",
                        openStatus === "open" &&
                          "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.65)]",
                        openStatus === "closed" && "bg-zinc-600",
                      )}
                      aria-hidden
                    />
                    {openStatus === "unknown"
                      ? "Comprobando…"
                      : openStatus === "open"
                        ? "Abierto ahora"
                        : "Cerrado ahora"}
                  </span>
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-800/50 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        <th className="px-4 py-2.5 font-semibold">Día</th>
                        <th className="px-4 py-2.5 font-semibold">Horario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/90 text-zinc-200">
                      {HOURS_ROWS.map((row) => (
                        <tr
                          key={row.label}
                          className="bg-zinc-900/40 transition hover:bg-zinc-800/30"
                        >
                          <td className="px-4 py-3 font-medium text-zinc-100">
                            {row.label}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {row.hours}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-zinc-500">
                <span aria-hidden>📍 </span>
                Ubicados estratégicamente cerca de {nearbyLandmark} para tu
                comodidad.
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Cómo llegar
              </p>
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                <a
                  href={WAZE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 min-w-[8.5rem] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                  aria-label="Abrir ruta en Waze"
                >
                  <Navigation className="size-4 shrink-0" aria-hidden />
                  Waze
                </a>
                <a
                  href={STORE_DIRECTIONS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 min-w-[8.5rem] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                  aria-label="Abrir ruta en Google Maps"
                >
                  <MapPinned className="size-4 shrink-0" aria-hidden />
                  Google Maps
                </a>
                <a
                  href={whatsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 min-w-[8.5rem] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                  aria-label="Pedir indicaciones por WhatsApp"
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  WhatsApp
                </a>
              </div>
              <a
                href={STORE_MAP_SEARCH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs font-medium text-blue-400 transition hover:text-blue-300 sm:text-left"
              >
                Ver ficha en Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </ScrollFadeSection>
  );
}
