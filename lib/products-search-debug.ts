/** Logs de depuración para la búsqueda de productos (solo desarrollo). */
const ENABLED =
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "development";

export function logProductsSearch(
  event: string,
  payload?: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  if (payload) {
    console.log(`[products-search] ${event}`, payload);
  } else {
    console.log(`[products-search] ${event}`);
  }
}
