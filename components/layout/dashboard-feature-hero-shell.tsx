"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type DashboardFeatureHeroShellProps = {
  ariaLabel: string;
  left: ReactNode;
  right: ReactNode;
  /** Fila opcional bajo el grid principal (métricas, etc.). */
  below?: ReactNode;
};

/** Fondo y layout del hero de búsqueda / acciones (Lista de Precios, Inventario, etc.). */
export function DashboardFeatureHeroShell({
  ariaLabel,
  left,
  right,
  below,
}: DashboardFeatureHeroShellProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-xl shadow-primary/5"
      aria-label={ariaLabel}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-background to-violet-500/[0.08] dark:from-primary/20 dark:via-zinc-950 dark:to-violet-950/30"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.25) 0%, transparent 45%), radial-gradient(circle at 85% 70%, rgb(139 92 246 / 0.18) 0%, transparent 40%)",
        }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-violet-500/15 blur-3xl"
        animate={{ x: [0, -25, 0], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          {left}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {right}
        </motion.div>
      </div>

      {below ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="relative border-t border-primary/10 px-6 pb-6 pt-6 sm:px-8 lg:px-10"
        >
          {below}
        </motion.div>
      ) : null}
    </section>
  );
}

export function DashboardFeatureHeroPanel({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        className="pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-gradient-to-r from-primary/40 via-blue-500/30 to-violet-500/40 opacity-60 blur-xl dark:opacity-40"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-background/55 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl dark:bg-zinc-950/55 sm:p-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          aria-hidden
        />
        {children}
      </div>
    </>
  );
}

export function DashboardFeatureHeroBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
      {children}
    </div>
  );
}

export function DashboardFeatureHeroTitle({
  line1,
  line2,
}: {
  line1: string;
  line2: string;
}) {
  return (
    <h2 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
      <span className="bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
        {line1}
      </span>
      <br />
      <span className="bg-gradient-to-r from-primary via-blue-500 to-violet-500 bg-clip-text text-transparent">
        {line2}
      </span>
    </h2>
  );
}
