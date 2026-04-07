"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { LANDING_ABSTRACT_BG_URL } from "@/components/public/landing-section-styles";

/**
 * Fondo fijo detrás del contenido (`z-0`). La capa de imagen se desplaza con el scroll (parallax).
 */
export function PublicPageBackdrop() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const parallaxY = useTransform(scrollY, (y) =>
    reduceMotion === true ? 0 : y * 0.14,
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-zinc-950" />
      {/* Más alto que el viewport para que el movimiento no deje bordes */}
      <motion.div
        className="absolute -top-[18%] left-0 h-[136%] w-full bg-cover bg-center bg-no-repeat opacity-[0.4] saturate-[0.58] brightness-[0.7] contrast-[0.98]"
        style={{
          y: parallaxY,
          backgroundImage: `url(${LANDING_ABSTRACT_BG_URL})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/78 via-zinc-950/58 to-zinc-950/82" />
      <div className="absolute inset-0 bg-zinc-950/18" />
      <div className="landing-noise-overlay absolute inset-0 !opacity-[0.035]" />
    </div>
  );
}
