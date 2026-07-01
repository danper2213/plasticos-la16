"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

const DEFAULT_BASE_PATH = "/dashboard/payables";

interface MonthPaginatorProps {
  /** Ruta base para los query params (ej. /dashboard/closures). Por defecto /dashboard/payables */
  basePath?: string;
}

export function MonthPaginator({ basePath = DEFAULT_BASE_PATH }: MonthPaginatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  const currentDate = new Date(year, month - 1, 1);
  const prevMonth = subMonths(currentDate, 1);
  const nextMonth = addMonths(currentDate, 1);

  const rawLabel = format(currentDate, "LLLL yyyy", { locale: es });
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  function goToPrev() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(prevMonth.getMonth() + 1));
    params.set("year", String(prevMonth.getFullYear()));
    router.push(`${basePath}?${params.toString()}`);
  }

  function goToNext() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(nextMonth.getMonth() + 1));
    params.set("year", String(nextMonth.getFullYear()));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:justify-start">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrev}
        aria-label="Mes anterior"
        className="h-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10"
      >
        <ChevronLeft className="size-4" />
        <span className="ml-1 hidden sm:inline">Anterior</span>
      </Button>

      <span className="min-w-[9rem] rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-center text-xs font-semibold tabular-nums text-foreground backdrop-blur-sm sm:min-w-[10rem] sm:text-sm">
        {label}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={goToNext}
        aria-label="Mes siguiente"
        className="h-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10"
      >
        <span className="mr-1 hidden sm:inline">Siguiente</span>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
