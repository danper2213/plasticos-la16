"use client";

import { useEffect, useState } from "react";

/**
 * Retrasa la actualización de un valor (p. ej. texto de búsqueda) para no saturar el DOM.
 */
export function useDebounce<T>(value: T, delayMs = 280): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
