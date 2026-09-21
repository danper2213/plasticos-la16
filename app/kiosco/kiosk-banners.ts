import {
  BUSINESS_NAME,
  BUSINESS_STREET,
  BUSINESS_VENUE,
  BUSINESS_CITY,
  BUSINESS_REGION,
} from "@/lib/business-location";

/**
 * Banners del protector de pantalla del kiosco.
 *
 * Para un gráfico: guardá el archivo en `public/kiosco/banners/`
 * y asigná `imageSrc: "/kiosco/banners/nombre.jpg"`.
 * Si no hay imagen, se muestra el slide tipográfico.
 */
export type KioskBannerSlide = {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  imageSrc?: string | null;
};

export const KIOSK_SCREENSAVER_IDLE_MS = 30_000;
/** Entre 6 y 8 s; 7 s como punto medio. */
export const KIOSK_BANNER_INTERVAL_MS = 7_000;

export const KIOSK_BANNER_SLIDES: KioskBannerSlide[] = [
  {
    id: "identidad",
    eyebrow: BUSINESS_NAME,
    title: "Consulta aquí el precio de tus productos",
    subtitle: `Consulta de precios · ${BUSINESS_NAME}`,
    imageSrc: null,
  },
  {
    id: "mayorista",
    eyebrow: "Venta al por mayor",
    title: "Precios especiales por paca, bulto y caja",
    subtitle: "Pedí en mostrador las presentaciones de mayor volumen.",
    imageSrc: null,
  },
  {
    id: "contacto",
    eyebrow: "Atención local",
    title: `${BUSINESS_CITY}, ${BUSINESS_REGION}`,
    subtitle: `${BUSINESS_VENUE} · ${BUSINESS_STREET}`,
    imageSrc: null,
  },
];

export const KIOSK_SCREENSAVER_HINT =
  "Pasa un producto por el lector o toca la pantalla para consultar";
