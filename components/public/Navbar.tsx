"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicSocialSettings } from "@/utils/public-settings";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#catalogo", label: "Catálogo" },
  { href: "#destacados", label: "Destacados" },
  { href: "#ubicacion", label: "Ubicación" },
] as const;

interface NavbarProps {
  socialSettings: PublicSocialSettings;
}

function getWhatsAppHref(whatsappUrl?: string): string {
  if (whatsappUrl?.trim()) return whatsappUrl.trim();
  return "https://wa.me/?text=" + encodeURIComponent("Hola PLASTICOS LA 16");
}

export function Navbar({ socialSettings }: NavbarProps) {
  const [open, setOpen] = React.useState(false);
  const whatsappHref = React.useMemo(
    () => getWhatsAppHref(socialSettings.whatsapp_url),
    [socialSettings.whatsapp_url]
  );

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-4 z-50 px-3 sm:px-4">
      <nav
        className={cn(
          "mx-auto flex max-w-5xl flex-col gap-0",
          "rounded-full border border-zinc-800 bg-zinc-900/80 shadow-lg shadow-black/20 backdrop-blur-md",
        )}
        aria-label="Principal"
      >
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
          <Link
            href="#inicio"
            className="flex shrink-0 items-center gap-2 rounded-full outline-none ring-blue-600 transition hover:opacity-90 focus-visible:ring-2"
            onClick={closeMenu}
          >
            <Image
              src="/logo.png"
              alt="PLASTICOS LA 16"
              width={40}
              height={40}
              className="size-9 rounded-full object-contain"
            />
            <span className="hidden text-sm font-semibold tracking-tight text-zinc-100 sm:inline">
              PLASTICOS <span className="text-[#2563eb]">LA 16</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Link
              href="/login"
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <User className="size-4 shrink-0 text-zinc-300" aria-hidden />
              Ingresar
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              WhatsApp
            </a>
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/60 text-zinc-100 transition hover:bg-zinc-800 md:hidden"
            aria-expanded={open}
            aria-controls="public-nav-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <div
          id="public-nav-mobile"
          className={cn(
            "border-t border-zinc-800/80 px-4 pb-4 pt-2 md:hidden",
            open ? "block" : "hidden",
          )}
        >
          <div className="flex flex-col gap-1 rounded-2xl bg-zinc-950/50 py-2">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800/60 hover:text-white"
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/login"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-100"
              onClick={closeMenu}
            >
              <User className="size-4" aria-hidden />
              Ingresar
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
