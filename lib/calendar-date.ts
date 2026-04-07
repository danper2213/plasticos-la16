/**
 * Fechas calendario (sin hora) en hora local Colombia / inputs type="date".
 * Evita el desfase “un día antes” al usar toISOString() o new Date("YYYY-MM-DD").
 */

/** Valor para `<input type="date" />` en la zona horaria del navegador. */
export function localDateInputValue(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Muestra una fecha solo-día (columna `date` o prefijo YYYY-MM-DD) en es-CO.
 */
export function formatDateOnlyEsCO(value: string | null | undefined): string {
  if (!value) return "—";
  const head = value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
  const m = YMD.exec(head);
  if (!m) {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const local = new Date(y, mo - 1, d);
  return local.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Fecha y hora local desde un ISO timestamptz (p. ej. Supabase). */
export function formatDateTimeEsCO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
