/** Genera un slug URL-safe único a partir del nombre, presentación e id del producto. */
export function buildProductSlug(
  name: string,
  presentation: string,
  productId: string,
): string {
  const base = `${name} ${presentation}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  const suffix = productId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return `${base || "producto"}-${suffix}`;
}
