"use client";

import { useEffect, useMemo } from "react";
import {
  buildProductsListPath,
  type ProductsListUrlState,
} from "@/lib/products-list-url";
import { logProductsSearch } from "@/lib/products-search-debug";

/** Sincroniza ?q= / filtros en la barra de dirección sin refetch RSC (replaceState). */
export function useProductsListUrlSync(state: ProductsListUrlState) {
  const syncKey = useMemo(
    () =>
      [
        state.search,
        state.page,
        state.stockFilter,
        state.categoryId,
        state.supplierId,
      ].join("\0"),
    [
      state.search,
      state.page,
      state.stockFilter,
      state.categoryId,
      state.supplierId,
    ],
  );

  useEffect(() => {
    const nextPath = buildProductsListPath(state);
    if (typeof window === "undefined") return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath === nextPath) return;

    logProductsSearch("URL sync (replaceState, sin refetch RSC)", {
      from: currentPath,
      to: nextPath,
      activeSearch: state.search,
      page: state.page,
    });
    window.history.replaceState(window.history.state, "", nextPath);
    // syncKey agrega todos los campos de state; el closure usa el state del render actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncKey === fingerprint de state
  }, [syncKey]);
}
