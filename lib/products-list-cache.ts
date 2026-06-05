import type { ProductsPageResult } from "@/app/dashboard/products/actions";

const PAGE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGE_ENTRIES = 60;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

class SessionCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.fetchedAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    while (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (!oldest) break;
      this.store.delete(oldest);
    }

    this.store.set(key, { data, fetchedAt: Date.now() });
  }

  clear(): void {
    this.store.clear();
  }
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function buildProductsPageCacheKey(params: {
  page: number;
  search: string;
  stockFilter: string;
  categoryId: string;
  supplierId: string;
}): string {
  return [
    "page",
    params.page,
    normalizeSearch(params.search),
    params.stockFilter,
    params.categoryId,
    params.supplierId,
  ].join("|");
}

export const productsPageCache = new SessionCache<ProductsPageResult>(
  MAX_PAGE_ENTRIES,
  PAGE_TTL_MS,
);

export function clearProductsListCache(): void {
  productsPageCache.clear();
}
