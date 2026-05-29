"use client";

import Lottie from "lottie-react";
import searchLoadingAnimation from "@/lib/lottie/search-loading.json";
import { cn } from "@/lib/utils";

type SearchLottieProps = {
  className?: string;
  size?: number;
  /** Texto para lectores de pantalla cuando el loader es el único indicador visible. */
  ariaLabel?: string;
};

export function SearchLottie({
  className,
  size = 32,
  ariaLabel = "Buscando",
}: SearchLottieProps) {
  return (
    <div
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
      role={ariaLabel ? "status" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <Lottie
        animationData={searchLoadingAnimation}
        loop
        className="size-full"
      />
    </div>
  );
}
