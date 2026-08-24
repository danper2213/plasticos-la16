"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import searchLoadingAnimation from "@/lib/lottie/search-loading.json";
import { cn } from "@/lib/utils";

const SAVE_STEPS = [
  "Validando stock en bodega…",
  "Creando el comprobante…",
  "Registrando movimientos…",
  "Actualizando existencias…",
  "Sincronizando catálogo…",
] as const;

type MovementProcessingOverlayProps = {
  lineCount?: number;
  className?: string;
};

export function MovementProcessingOverlay({
  lineCount = 1,
  className,
}: MovementProcessingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
    const id = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SAVE_STEPS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  const title =
    lineCount <= 1
      ? "Guardando movimiento"
      : `Guardando ${lineCount} movimientos`;

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/88 backdrop-blur-md px-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex size-36 items-center justify-center sm:size-44">
        <Lottie
          animationData={searchLoadingAnimation}
          loop
          className="size-full"
        />
      </div>

      <div className="max-w-sm text-center space-y-2">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p
          key={stepIndex}
          className="text-sm text-muted-foreground animate-in fade-in duration-300"
        >
          {SAVE_STEPS[stepIndex]}
        </p>
        <p className="text-xs text-muted-foreground/80 pt-1">
          No cierres esta ventana mientras termina.
        </p>
      </div>

      <div className="flex gap-1.5 mt-1" aria-hidden>
        {SAVE_STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              i === stepIndex ? "bg-primary" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
