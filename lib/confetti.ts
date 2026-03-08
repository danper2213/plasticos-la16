import confetti from "canvas-confetti";

const BRAND_EMERALD = "#10b981";
const WHITE = "#ffffff";

/**
 * Fires a confetti blast from the center of the screen using brand colors (Emerald + White).
 * Call after successful create/update actions for visual celebration.
 */
export function triggerSuccess(): void {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.5, y: 0.5 },
    colors: [BRAND_EMERALD, WHITE],
    startVelocity: 28,
  });
}
