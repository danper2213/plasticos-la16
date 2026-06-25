"use client";

import { forwardRef } from "react";
import { Layers } from "lucide-react";
import { SearchLottie } from "@/components/ui/search-lottie";
import {
  DashboardSearchHero,
} from "@/components/layout/dashboard-search-hero";
import type { DashboardSearchBarHandle } from "@/components/layout/dashboard-search-bar";

type ProductsSearchHeroProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  totalCount: number;
  totalPages: number;
  page: number;
  totalRegistered: number;
  isLoading?: boolean;
  isSearching: boolean;
  hasActiveFilters?: boolean;
};

export const ProductsSearchHero = forwardRef<DashboardSearchBarHandle, ProductsSearchHeroProps>(
  function ProductsSearchHero(
    {
      searchQuery,
      onSearchQueryChange,
      onSearchClear,
      onSearchSubmit,
      totalCount,
      totalPages,
      page,
      totalRegistered,
      isLoading = false,
      isSearching,
      hasActiveFilters = false,
    },
    ref,
  ) {
    const showStatus = isSearching || totalCount > 0 || hasActiveFilters;

    return (
      <DashboardSearchHero
        ref={ref}
        icon={Layers}
        title="¿Qué producto buscas?"
        description={
          <>
            Nombre, código de escaneo o medida — por ejemplo{" "}
            <span className="font-medium text-foreground/80">vaso 7 oz</span> o{" "}
            <span className="font-medium text-foreground/80">j1</span>
          </>
        }
        ariaLabel="Búsqueda de productos"
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchClear={onSearchClear}
        onSearchSubmit={onSearchSubmit}
        placeholder="Buscar: portacomida, j1, 12oz…"
        searchAriaLabel="Buscar productos"
        status={
          showStatus ? (
            isLoading ? (
              <div className="flex items-center justify-center gap-2 tabular-nums">
                <SearchLottie size={22} ariaLabel="Cargando resultados" />
                <span>Cargando resultados…</span>
              </div>
            ) : (
              <p className="tabular-nums">
                {isSearching || hasActiveFilters ? (
                  <>
                    {totalCount} resultado{totalCount === 1 ? "" : "s"}
                    {isSearching ? " · Ordenados por relevancia" : ""}
                    {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
                  </>
                ) : (
                  <>
                    {totalCount} producto{totalCount === 1 ? "" : "s"} activo
                    {totalCount === 1 ? "" : "s"}
                    {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
                    {" · "}
                    {totalRegistered} registrados en total
                  </>
                )}
              </p>
            )
          ) : (
            <p className="tabular-nums">{totalRegistered} productos registrados</p>
          )
        }
      />
    );
  },
);

export type { DashboardSearchBarHandle as ProductSearchBarHandle };
