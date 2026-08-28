"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import searchLoadingAnimation from "@/lib/lottie/search-loading.json";
import { cn } from "@/lib/utils";

const EXTRACT_STEPS = [
  "Leyendo el PDF / foto…",
  "Extrayendo líneas con IA…",
  "Calculando costos y metraje…",
  "Buscando productos coincidentes…",
  "Preparando vista de confirmación…",
] as const;

const SHEET_EXTRACT_STEPS = [
  "Leyendo la foto…",
  "Reconociendo cantidades y productos…",
  "Detectando si es entrada o salida…",
  "Buscando coincidencias en el catálogo…",
  "Preparando la confirmación…",
] as const;

const CONFIRM_STEPS = [
  "Guardando aprendizajes…",
  "Actualizando costos confirmados…",
  "Sincronizando catálogo…",
] as const;

type InvoiceCostProcessingOverlayProps = {
  mode: "extract" | "confirm" | "extract-sheet";
  className?: string;
};

function overlayCopy(mode: InvoiceCostProcessingOverlayProps["mode"]) {
  if (mode === "extract-sheet") {
    return {
      title: "Leyendo movimiento de inventario",
      steps: SHEET_EXTRACT_STEPS,
    };
  }
  if (mode === "extract") {
    return { title: "Extrayendo y verificando factura", steps: EXTRACT_STEPS };
  }
  return { title: "Confirmando cambios", steps: CONFIRM_STEPS };
}

export function InvoiceCostProcessingOverlay({
  mode,
  className,
}: InvoiceCostProcessingOverlayProps) {
  const { title, steps } = overlayCopy(mode);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
    const id = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [mode, steps.length]);

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-md px-6",
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
          key={`${mode}-${stepIndex}`}
          className="text-sm text-muted-foreground animate-in fade-in duration-300"
        >
          {steps[stepIndex]}
        </p>
      </div>

      <div className="flex gap-1.5 mt-1" aria-hidden>
        {steps.map((_, i) => (
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
