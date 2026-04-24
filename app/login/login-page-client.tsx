"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LoginForm } from "./login-form";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md animate-pulse overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-2xl backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/60">
      <div className="border-b border-border/60 px-6 py-5 dark:border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded bg-muted" />
            <div className="h-4 w-56 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-11 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

const easeOut = [0.16, 1, 0.3, 1] as const;

export function LoginPageClient() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Base + mesh */}
      <div className="pointer-events-none absolute inset-0 bg-background" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.22),transparent_55%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,hsl(217_91%_59%/0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background))_85%)]" />

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.45) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 70%)",
        }}
      />

      {/* Blobs */}
      {!reduceMotion && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-32 top-1/4 size-[420px] rounded-full bg-primary/20 blur-[100px] dark:bg-blue-500/15"
            animate={{ x: [0, 40, 0], y: [0, 24, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -right-24 bottom-0 size-[380px] rounded-full bg-primary/15 blur-[90px] dark:bg-sky-400/12"
            animate={{ x: [0, -32, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[8%] size-[280px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[80px] dark:bg-indigo-500/10"
            animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.12, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        </>
      )}
      {reduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.12),transparent_45%),radial-gradient(circle_at_80%_80%,hsl(var(--primary)/0.08),transparent_40%)]"
          aria-hidden
        />
      )}

      <motion.div
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8"
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: reduceMotion ? 0 : 0.08, delayChildren: reduceMotion ? 0 : 0.06 },
          },
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, x: -8 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: easeOut } },
          }}
          className="self-start"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <motion.span
              className="inline-flex"
              whileHover={reduceMotion ? {} : { x: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <ArrowLeft
                className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </motion.span>
            Volver al inicio
          </Link>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
          }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <motion.div
            whileHover={reduceMotion ? {} : { scale: 1.03 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="relative"
          >
            <div className="absolute -inset-3 rounded-2xl bg-primary/5 blur-xl dark:bg-blue-500/10" aria-hidden />
            <Image
              src="/logo.png"
              alt="Logo PLASTICOS LA 16"
              width={140}
              height={56}
              priority
              className="relative h-auto w-[140px] object-contain drop-shadow-md dark:drop-shadow-[0_0_28px_rgba(59,130,246,0.15)]"
            />
          </motion.div>
          <div>
            <p className="text-xl font-bold tracking-tight text-foreground">
              PLASTICOS <span className="text-primary">LA 16</span>
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sistema de gestión y control
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
          }}
          className="w-full"
        >
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm reduceMotion={!!reduceMotion} />
          </Suspense>
        </motion.div>
      </motion.div>
    </div>
  );
}
