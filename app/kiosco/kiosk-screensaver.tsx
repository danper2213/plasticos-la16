"use client";

import * as React from "react";
import Image from "next/image";
import { Boxes, MapPin, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_NAME } from "@/lib/business-location";
import {
  KIOSK_BANNER_INTERVAL_MS,
  KIOSK_BANNER_SLIDES,
  KIOSK_SCREENSAVER_HINT,
  type KioskBannerSlide,
} from "@/app/kiosco/kiosk-banners";

const SLIDE_ICONS = [ScanLine, Boxes, MapPin] as const;

type KioskScreensaverProps = {
  active: boolean;
  onDismiss: () => void;
};

function SlideVisual({ slide, index }: { slide: KioskBannerSlide; index: number }) {
  const Icon = SLIDE_ICONS[index % SLIDE_ICONS.length] ?? ScanLine;

  if (slide.imageSrc) {
    return (
      <Image
        src={slide.imageSrc}
        alt=""
        fill
        priority={index === 0}
        className="object-cover"
        sizes="100vw"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950">
      <div className="absolute -left-24 top-16 size-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -right-16 bottom-10 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute right-1/4 top-1/3 size-52 rounded-full bg-sky-500/10 blur-3xl" />
      <Icon
        className="absolute right-8 top-8 size-24 text-white/10 sm:right-14 sm:top-14 sm:size-32"
        aria-hidden
      />
    </div>
  );
}

export function KioskScreensaver({ active, onDismiss }: KioskScreensaverProps) {
  const [index, setIndex] = React.useState(0);
  const slides = KIOSK_BANNER_SLIDES;

  React.useEffect(() => {
    if (!active) {
      setIndex(0);
      return undefined;
    }
    if (slides.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, KIOSK_BANNER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, slides.length]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col text-white transition-opacity duration-700",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!active}
      onClick={onDismiss}
      onTouchStart={onDismiss}
    >
      <div className="relative min-h-0 flex-1">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 overflow-hidden transition-opacity duration-700",
              slideIndex === index ? "opacity-100" : "opacity-0",
            )}
          >
            <SlideVisual slide={slide} index={slideIndex} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
            <div className="relative flex h-full flex-col items-center justify-center px-8 text-center sm:px-16">
              <Image
                src="/logo.png"
                alt={BUSINESS_NAME}
                width={180}
                height={72}
                className="mb-8 h-14 w-auto object-contain sm:h-16"
              />
              {slide.eyebrow ? (
                <p className="text-xs font-semibold tracking-[0.22em] text-emerald-300 uppercase sm:text-sm">
                  {slide.eyebrow}
                </p>
              ) : null}
              <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {slide.title}
              </h2>
              {slide.subtitle ? (
                <p className="mt-5 max-w-2xl text-lg text-white/80 sm:text-2xl">
                  {slide.subtitle}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 bg-black/40 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center gap-2" aria-hidden>
          {slides.map((slide, slideIndex) => (
            <span
              key={slide.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                slideIndex === index ? "w-8 bg-emerald-400" : "w-1.5 bg-white/35",
              )}
            />
          ))}
        </div>
        <p className="text-center text-sm font-medium tracking-wide text-white/75 sm:text-base">
          {KIOSK_SCREENSAVER_HINT}
        </p>
      </div>
    </div>
  );
}
