/**
 * Mapeo de nombres de bancos (Colombia y comunes) a dominio para obtener icono.
 * Se usa con el servicio de favicon de Google para mostrar el logo del banco.
 */

const BANK_DOMAINS: Record<string, string> = {
  bancolombia: "bancolombia.com",
  "banco colombia": "bancolombia.com",
  davivienda: "davivienda.com",
  bbva: "bbva.com.co",
  "bbva colombia": "bbva.com.co",
  "banco de bogotá": "bancodebogota.com",
  "banco de bogota": "bancodebogota.com",
  bogotá: "bancodebogota.com",
  "banco de occidente": "banoccidente.com.co",
  occidente: "banoccidente.com.co",
  "banco popular": "bancopopular.com.co",
  popular: "bancopopular.com.co",
  nequi: "nequi.com.co",
  daviplata: "daviplata.com",
  scotiabank: "scotiabankcolpatria.com",
  colpatria: "scotiabankcolpatria.com",
  "scotiabank colpatria": "scotiabankcolpatria.com",
  "caja social": "cas.org.co",
  "banco caja social": "cas.org.co",
  itau: "itau.com.co",
  "banco itaú": "itau.com.co",
  "banco itau": "itau.com.co",
  pichincha: "bancopichincha.com.co",
  "banco pichincha": "bancopichincha.com.co",
  "av villas": "bancoavvillas.com.co",
  "banco av villas": "bancoavvillas.com.co",
  gnb: "gnbsudameris.com",
  "gnb sudameris": "gnbsudameris.com",
  sudameris: "gnbsudameris.com",
  coomeva: "coomeva.com.co",
  bancoomeva: "coomeva.com.co",
};

function normalizeBankName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0301/g, "")
    .replace(/\u0300/g, "")
    .trim();
}

/**
 * Devuelve la URL del favicon/logo del banco (Google Favicon API).
 * Si el banco está en el mapeo, devuelve la URL; si no, null (usar fallback).
 */
export function getBankLogoUrl(bankName: string | null | undefined): string | null {
  if (!bankName?.trim()) return null;
  const normalized = normalizeBankName(bankName);
  const domain = BANK_DOMAINS[normalized];
  if (!domain) {
    // Intentar coincidencia parcial (ej. "Bancolombia S.A." contiene "bancolombia")
    for (const [key, d] of Object.entries(BANK_DOMAINS)) {
      if (normalized.includes(key) || key.includes(normalized)) return buildFaviconUrl(d);
    }
    return null;
  }
  return buildFaviconUrl(domain);
}

function buildFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Iniciales para fallback cuando no hay logo (ej. "Bancolombia" → "BA").
 */
export function getBankInitials(bankName: string | null | undefined): string {
  if (!bankName?.trim()) return "?";
  const words = bankName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2);
  }
  return bankName.slice(0, 2).toUpperCase();
}
