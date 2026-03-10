/**
 * Dígito de verificación DIAN (Colombia)
 * Aplica tanto al NIT (personas jurídicas, 9 dígitos) como a la cédula (personas naturales, hasta 10 dígitos).
 * Normativa: algoritmo módulo 11 con coeficientes fijos publicados por la DIAN.
 *
 * Referencias:
 * - https://gobco.com.co/calculo-digito-verificacion/
 * - Serie de coeficientes (derecha a izquierda): 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71
 * - Suma de (dígito × coeficiente) → residuo = suma % 11 → si residuo 0 o 1, DV = residuo; si no, DV = 11 - residuo
 */

const COEFICIENTES = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/**
 * Extrae solo los dígitos del número (sin guión ni puntos).
 * Ej: "800.197.384-0" → "800197384"
 */
function soloDigitos(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Calcula el dígito de verificación para un NIT o cédula (solo la parte numérica, sin el DV).
 * @param numero - Número sin dígito de verificación (ej: "800197384" o "811026552")
 * @returns Dígito de verificación (0-9)
 */
export function calcularDigitoVerificacion(numero: string): number {
  const digitos = soloDigitos(numero);
  if (digitos.length === 0) return 0;

  let sumatoria = 0;
  const reversed = digitos.split("").reverse();
  for (let i = 0; i < reversed.length && i < COEFICIENTES.length; i++) {
    sumatoria += Number(reversed[i]) * COEFICIENTES[i];
  }

  const residuo = sumatoria % 11;
  if (residuo === 0 || residuo === 1) return residuo;
  return 11 - residuo;
}

/**
 * Parsea un NIT o cédula con formato "número-DV" o solo "número".
 * @returns { numero: string (solo dígitos), dv: number | null } si viene con guión, dv es el último dígito
 */
export function parseNitOCedula(value: string): { numero: string; dv: number | null } {
  const limpio = value.trim().replace(/\s/g, "");
  const partes = limpio.split("-");
  const numero = soloDigitos(partes[0] ?? "");
  if (partes.length > 1 && partes[1]) {
    const dvIngresado = soloDigitos(partes[1]);
    if (dvIngresado.length === 1) {
      return { numero, dv: Number(dvIngresado) };
    }
  }
  return { numero, dv: null };
}

/**
 * Valida que el dígito de verificación coincida con el número (NIT o cédula).
 * Acepta formato "800197384-0" o "8001973840" (9 dígitos + 1 DV, sin guión).
 * Si solo hay 9 dígitos sin guión, no se valida DV (se considera incompleto pero válido para no bloquear).
 */
export function validarNitOCedulaConDV(value: string): boolean {
  const { numero, dv } = parseNitOCedula(value);
  if (numero.length === 0) return false;
  if (dv !== null) {
    return calcularDigitoVerificacion(numero) === dv;
  }
  // Sin guión: solo validar si hay 10 dígitos (9 NIT + 1 DV) o 11 (10 cédula + 1 DV)
  if (numero.length === 10 || numero.length === 11) {
    const num = numero.slice(0, -1);
    const dvIngresado = Number(numero.slice(-1));
    return calcularDigitoVerificacion(num) === dvIngresado;
  }
  return true;
}

/**
 * Formatea número + DV como "XXX.XXX.XXX-X" (opcional, para mostrar).
 */
export function formatearNitConDV(numero: string, dv: number): string {
  const s = soloDigitos(numero);
  if (s.length <= 9) {
    return `${s}-${dv}`;
  }
  return `${s.slice(0, -1)}-${dv}`;
}

/**
 * Si el valor tiene 9 o 10 dígitos (sin DV o con DV incorrecto), devuelve el valor con el DV sugerido agregado (número-DV).
 * Si ya tiene el DV correcto o no aplica, devuelve el valor sin cambios.
 * Útil para auto-completar el campo al salir (onBlur).
 */
export function obtenerValorConDVSugerido(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const { numero, dv } = parseNitOCedula(trimmed);
  if (numero.length !== 9 && numero.length !== 10) return trimmed;

  const dvCorrecto = calcularDigitoVerificacion(numero);
  if (dv !== null && dv === dvCorrecto) return trimmed;

  return `${numero}-${dvCorrecto}`;
}
