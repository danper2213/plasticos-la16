import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BUSINESS_LOCATION_SHORT, BUSINESS_NAME } from "@/lib/business-location";

export function DashboardFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-12 shrink-0 pb-1">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <p className="text-xs font-semibold tracking-tight text-foreground/90">
            {BUSINESS_NAME}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground/75">
            Panel de gestión · {BUSINESS_LOCATION_SHORT}
          </p>
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]"
          aria-label="Enlaces del panel"
        >
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            Sitio público
            <ExternalLink className="size-3 opacity-60" aria-hidden />
          </Link>
          <span className="hidden h-3 w-px bg-border/70 sm:inline" aria-hidden />
          <span className="text-muted-foreground/65 tabular-nums">© {year}</span>
        </nav>
      </div>
    </footer>
  );
}
