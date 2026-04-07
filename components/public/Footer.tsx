import Image from "next/image";
import { Facebook, Instagram, MapPin, MessageCircle, Music2 } from "lucide-react";
import { NewsletterForm } from "@/components/public/NewsletterForm";
import type { PublicSocialSettings } from "@/utils/public-settings";

const QUICK_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#catalogo", label: "Catalogo" },
  { href: "#destacados", label: "Destacados" },
  { href: "#ubicacion", label: "Ubicacion" },
] as const;

interface FooterProps {
  socialSettings: PublicSocialSettings;
}

export function Footer({ socialSettings }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="overflow-hidden bg-transparent">
        <div className="bg-[#0b1020] px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Plasticos La 16"
                  width={48}
                  height={48}
                  className="size-12 rounded-full bg-zinc-950 object-contain p-1"
                />
                <div>
                  <p className="text-xl font-black tracking-tight text-white">
                    PLASTICOS <span className="text-blue-500">LA 16</span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    Empaques, vasos y plasticos para tu negocio.
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm text-zinc-400">
                Galeria La Concordia, Cl 16 #14 Esquina Local 45, Florencia,
                Caqueta.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Navegacion
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {QUICK_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Mantente conectado
              </p>
              <NewsletterForm />
              <div className="mt-4 flex items-center gap-3 text-zinc-400">
                <a
                  href={socialSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-700 p-2 transition hover:border-blue-500 hover:text-white"
                  aria-label="Instagram"
                >
                  <Instagram className="size-4" />
                </a>
                <a
                  href={socialSettings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-700 p-2 transition hover:border-blue-500 hover:text-white"
                  aria-label="Facebook"
                >
                  <Facebook className="size-4" />
                </a>
                <a
                  href={socialSettings.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-700 p-2 transition hover:border-blue-500 hover:text-white"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="size-4" />
                </a>
                <a
                  href={socialSettings.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-700 p-2 transition hover:border-blue-500 hover:text-white"
                  aria-label="TikTok"
                >
                  <Music2 className="size-4" />
                </a>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Pl%C3%A1sticos%20la%2016%2C%20Galeria%20La%20Concordia%2C%20Cl%2016%20%2314%20Esquina%20Local%2045%2C%20Florencia%2C%20Caquet%C3%A1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-700 p-2 transition hover:border-blue-500 hover:text-white"
                  aria-label="Ubicacion en Google Maps"
                >
                  <MapPin className="size-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-800/80 pt-6 text-xs text-zinc-500 sm:flex sm:items-center sm:justify-between">
            <span>© {year} PLASTICOS LA 16. Todos los derechos reservados.</span>
            <div className="mt-3 flex gap-4 sm:mt-0">
              <a href="#" className="transition hover:text-zinc-300">
                Terminos
              </a>
              <a href="#" className="transition hover:text-zinc-300">
                Privacidad
              </a>
              <a href="#" className="transition hover:text-zinc-300">
                Cookies
              </a>
            </div>
          </div>
        </div>
    </footer>
  );
}
