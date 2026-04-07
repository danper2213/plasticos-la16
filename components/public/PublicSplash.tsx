"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "pl16-public-splash-v1";

const MIN_VISIBLE_MS = 1450;
const EXIT_DURATION = 0.55;

export function PublicSplash() {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = React.useState(() => {
    try {
      return !sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const minMs = reduceMotion ? 280 : MIN_VISIBLE_MS;
  const skipMotion = Boolean(reduceMotion);

  React.useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => setShow(false), minMs);
    return () => window.clearTimeout(id);
  }, [show, minMs]);

  function handleExitComplete() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {show && (
        <motion.div
          key="public-splash"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#050507]"
          initial={skipMotion ? false : { opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={
            skipMotion
              ? { opacity: 0, transition: { duration: 0.12 } }
              : {
                  opacity: 0,
                  scale: 1.05,
                  filter: "blur(14px)",
                  transition: { duration: EXIT_DURATION, ease: [0.22, 1, 0.36, 1] },
                }
          }
        >
          {/* Luces / gradiente */}
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 85% 65% at 50% -25%, rgba(37, 99, 235, 0.38), transparent 55%), radial-gradient(ellipse 55% 45% at 100% 40%, rgba(59, 130, 246, 0.14), transparent 50%), radial-gradient(ellipse 45% 35% at 0% 85%, rgba(99, 102, 241, 0.12), transparent 48%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%20opacity%3D%220.04%22%2F%3E%3C%2Fsvg%3E')] opacity-60" />

          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            <motion.div
              initial={skipMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400"
            >
              Florencia, Caquetá
            </motion.div>

            <motion.h1
              className="max-w-md text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl"
              initial={skipMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                PLÁSTICOS
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                LA 16
              </span>
            </motion.h1>

            <motion.p
              className="mt-4 max-w-sm text-sm text-zinc-400 sm:text-base"
              initial={skipMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.4 }}
            >
              Empaques, plásticos y surtido para tu negocio.
            </motion.p>

            <motion.div
              className="mt-10 h-[3px] w-48 overflow-hidden rounded-full bg-zinc-800 sm:w-56"
              initial={skipMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.35 }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: Math.max(0.35, minMs / 1000 - 0.15),
                  ease: [0.33, 1, 0.68, 1],
                }}
                style={{ transformOrigin: "left" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
