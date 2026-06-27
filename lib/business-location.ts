/** Ubicación física del negocio — fuente única para landing, panel y mapas. */
export const BUSINESS_NAME = "Plásticos La 16";

export const BUSINESS_VENUE = "Galería La Concordia";

export const BUSINESS_STREET = "Cl. 16 #14 esquina, Local 45";

export const BUSINESS_CITY = "Florencia";

export const BUSINESS_REGION = "Caquetá";

export const BUSINESS_COUNTRY = "Colombia";

/** Ej.: Florencia, Caquetá — Colombia */
export const BUSINESS_CITY_REGION_COUNTRY = `${BUSINESS_CITY}, ${BUSINESS_REGION} — ${BUSINESS_COUNTRY}`;

/** Ej.: Galería La Concordia · Florencia, Caquetá */
export const BUSINESS_LOCATION_SHORT = `${BUSINESS_VENUE} · ${BUSINESS_CITY}, ${BUSINESS_REGION}`;

/** Dirección completa en una línea (mapas, WhatsApp). */
export const BUSINESS_FULL_ADDRESS = `${BUSINESS_NAME}, ${BUSINESS_VENUE}, ${BUSINESS_STREET}, ${BUSINESS_CITY}, ${BUSINESS_REGION}`;

const MAPS_QUERY = encodeURIComponent(BUSINESS_FULL_ADDRESS);

export const BUSINESS_MAP_EMBED = `https://maps.google.com/maps?q=${MAPS_QUERY}&t=&z=17&ie=UTF8&iwloc=&output=embed`;

export const BUSINESS_MAP_SEARCH = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;

export const BUSINESS_MAP_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`;

export const BUSINESS_WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent(BUSINESS_FULL_ADDRESS)}&navigate=yes`;

export const BUSINESS_NEARBY_LANDMARK =
  "la Galería La Concordia y el corredor comercial del centro de Florencia";

export const BUSINESS_TIMEZONE = "America/Bogota";
