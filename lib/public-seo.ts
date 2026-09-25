import {
  BUSINESS_CITY,
  BUSINESS_COUNTRY,
  BUSINESS_FULL_ADDRESS,
  BUSINESS_NAME,
  BUSINESS_REGION,
  BUSINESS_STREET,
  BUSINESS_VENUE,
} from "@/lib/business-location";

/** Nombre tal como se identifica la empresa en títulos y pestaña del navegador. */
export const PUBLIC_SITE_NAME = "PLASTICOS LA 16";

const SALE_MODES = "al por mayor y al detal";

export const PUBLIC_HOME_TITLE =
  `PLASTICOS LA 16 | Plásticos ${SALE_MODES} en Florencia`;

export const PUBLIC_HOME_DESCRIPTION =
  `PLASTICOS LA 16 vende plásticos ${SALE_MODES} en Florencia, Caquetá: termos, bolsas, portacomidas, vasos, empaques y más. Galería La Concordia, calle 16 #14, local 45.`;

export const PUBLIC_CATALOG_TITLE =
  `Catálogo de plásticos ${SALE_MODES} en Florencia`;

export const PUBLIC_CATALOG_DESCRIPTION =
  `Catálogo de plásticos ${SALE_MODES} en Florencia, Caquetá: termos, bolsas, portacomidas, vasos, empaques y más. Elegí un producto para ver la ficha y cotizar con PLASTICOS LA 16.`;

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Slug estable a partir del nombre de la categoría. No se guarda en la base. */
export function categoryToSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryPath(name: string): string {
  return `/productos/categoria/${categoryToSlug(name)}`;
}

export function productSearchTitle(name: string, metaTitle: string | null): string {
  const custom = metaTitle?.trim();
  if (custom) return custom;
  return `${name} ${SALE_MODES} en ${BUSINESS_CITY}`;
}

export function productTitleIsAbsolute(title: string): boolean {
  return /pl[aá]sticos la 16/i.test(title);
}

export function productSearchDescription(input: {
  metaDescription: string | null;
  name: string;
  presentation: string;
  packaging?: string | null;
}): string {
  const custom = input.metaDescription?.trim();
  if (custom) return custom;

  const presentation = input.presentation?.trim();
  const packaging = input.packaging?.trim();
  const named = presentation ? `${input.name} (${presentation})` : input.name;
  const pack = packaging ? ` Embalaje: ${packaging}.` : "";
  return `${named} se vende ${SALE_MODES} en ${PUBLIC_SITE_NAME}, ${BUSINESS_VENUE}, ${BUSINESS_CITY}, ${BUSINESS_REGION}.${pack} Cotizá por WhatsApp o visitá el local.`;
}

export function categorySearchTitle(categoryName: string): string {
  return `${categoryName} ${SALE_MODES} en ${BUSINESS_CITY}`;
}

export function categorySearchDescription(categoryName: string): string {
  return `${categoryName} ${SALE_MODES} en ${BUSINESS_CITY}, ${BUSINESS_REGION}. En ${PUBLIC_SITE_NAME} (${BUSINESS_VENUE}) encontrás esta línea. Elegí una referencia para ver la ficha y cotizar.`;
}

export function absoluteAssetUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteUrl()}${path}`;
}

function telephoneFromWhatsApp(url: string | null | undefined): string | undefined {
  const match = url?.match(/wa\.me\/(\d+)/);
  if (!match) return undefined;
  return `+${match[1]}`;
}

export function localBusinessJsonLd(whatsappUrl?: string | null): Record<string, unknown> {
  const telephone = telephoneFromWhatsApp(whatsappUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: PUBLIC_SITE_NAME,
    alternateName: BUSINESS_NAME,
    description: PUBLIC_HOME_DESCRIPTION,
    url: getSiteUrl(),
    image: absoluteAssetUrl("/logo.png"),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${BUSINESS_STREET}, ${BUSINESS_VENUE}`,
      addressLocality: BUSINESS_CITY,
      addressRegion: BUSINESS_REGION,
      addressCountry: BUSINESS_COUNTRY,
    },
    ...(telephone ? { telephone } : {}),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "07:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "07:00",
        closes: "12:00",
      },
    ],
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  slug: string;
  imageUrl: string | null;
  categoryName: string;
}): Record<string, unknown> {
  const pageUrl = `${getSiteUrl()}/productos/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    category: input.categoryName,
    url: pageUrl,
    ...(input.imageUrl ? { image: absoluteAssetUrl(input.imageUrl) } : {}),
    brand: { "@type": "Brand", name: PUBLIC_SITE_NAME },
    offers: {
      "@type": "Offer",
      url: pageUrl,
      availability: "https://schema.org/InStock",
      priceCurrency: "COP",
      seller: {
        "@type": "Store",
        name: PUBLIC_SITE_NAME,
        address: BUSINESS_FULL_ADDRESS,
      },
    },
  };
}
