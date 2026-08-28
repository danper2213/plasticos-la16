import { getStockDisplayInfo } from "@/lib/inventory-stock-display";
import { unitPriceFromCostAndUtilityPercent } from "@/lib/quotes/pricing";
import type { VoiceProductIntent } from "@/lib/products-voice-query";

/** Misma utilidad que la card de lista de precios. */
export const PRODUCTS_LIST_SALE_UTILITY_PERCENT = 25;

export type VoiceAnnounceProduct = {
  name: string;
  cost: number;
  stock_quantity: number | null;
  packaging: string | null;
  presentation?: string | null;
};

function salePrice(cost: number): number {
  return unitPriceFromCostAndUtilityPercent(
    cost,
    PRODUCTS_LIST_SALE_UTILITY_PERCENT,
  );
}

function pesosLabel(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("es-CO")} pesos`;
}

function stockLabel(product: VoiceAnnounceProduct): string {
  return getStockDisplayInfo(
    product.stock_quantity,
    product.packaging,
    product.presentation,
  ).primary;
}

function productPriceClause(product: VoiceAnnounceProduct): string {
  return `${product.name}, a ${pesosLabel(salePrice(product.cost))}`;
}

function moreResultsSuffix(count: number): string {
  return count > 1 ? ` Encontré ${count} productos.` : "";
}

function priceAnswer(product: VoiceAnnounceProduct): string {
  return `${product.name} sale a ${pesosLabel(salePrice(product.cost))}.`;
}

function stockAnswer(product: VoiceAnnounceProduct): string {
  if (product.stock_quantity == null) {
    return `${product.name} sin saldo cargado.`;
  }
  if (product.stock_quantity <= 0) {
    return `${product.name} no tiene stock.`;
  }
  return `${product.name} tiene ${stockLabel(product)}.`;
}

function emptyAnswer(query: string): string {
  return query
    ? `No encontré productos para ${query}.`
    : "No encontré productos.";
}

/**
 * Frase en español para leer los resultados de una búsqueda por voz.
 */
export function buildProductsVoiceAnnouncement(input: {
  query: string;
  totalCount: number;
  products: VoiceAnnounceProduct[];
  intent?: VoiceProductIntent;
}): string {
  const query = input.query.trim();
  const count = input.totalCount;
  const first = input.products[0];
  const intent = input.intent ?? "search";

  if (count <= 0 || !first) {
    return emptyAnswer(query);
  }

  if (intent === "price") {
    return `${priceAnswer(first)}${moreResultsSuffix(count)}`;
  }

  if (intent === "stock") {
    return `${stockAnswer(first)}${moreResultsSuffix(count)}`;
  }

  if (count === 1) {
    return `Encontré ${first.name}. Precio de venta ${pesosLabel(salePrice(first.cost))}. Stock ${stockLabel(first)}.`;
  }

  if (count <= 3) {
    const rest = input.products.slice(1, count).map((p) => productPriceClause(p));
    const extra = rest.length > 0 ? ` También ${rest.join(". También ")}.` : "";
    return `Encontré ${count} productos. El primero es ${productPriceClause(first)}.${extra}`;
  }

  return `Encontré ${count} productos. El primero es ${productPriceClause(first)}.`;
}
