"use client";

import * as React from "react";

/** True después del primer paint en cliente (evita mismatch de Radix useId en SSR). */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
