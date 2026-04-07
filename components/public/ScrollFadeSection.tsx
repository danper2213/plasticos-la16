"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollFadeSectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

/**
 * Atenúa y desplaza el bloque al entrar/salir del viewport (misma curva en toda la landing).
 */
export function ScrollFadeSection({
  id,
  className,
  children,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: ScrollFadeSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 32,
    mass: 0.35,
  });

  const progress = reduceMotion === true ? scrollYProgress : smoothProgress;

  const opacity = useTransform(
    progress,
    [0, 0.12, 0.22, 0.78, 0.9, 1],
    [0, 0.35, 1, 1, 0.45, 0.08],
  );
  const y = useTransform(progress, [0, 0.2], [22, 0]);

  return (
    <motion.section
      ref={ref}
      id={id}
      className={cn("relative", className)}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {reduceMotion === true ? (
        children
      ) : (
        <motion.div className="relative min-h-0 w-full" style={{ opacity, y }}>
          {children}
        </motion.div>
      )}
    </motion.section>
  );
}
