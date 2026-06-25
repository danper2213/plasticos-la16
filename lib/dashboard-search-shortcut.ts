/** Atajo global para enfocar la búsqueda del dashboard (layout ES/US). */
export function isDashboardSearchShortcut(event: KeyboardEvent): boolean {
  if (event.altKey) return false;

  const key = event.key;
  const withMod = event.ctrlKey || event.metaKey;

  if (withMod && key === "/") return true;

  if (withMod && event.shiftKey && key.toLowerCase() === "k") return true;

  if (!withMod && (key === "/" || event.code === "Slash")) return true;

  return false;
}

export function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** @deprecated Usar isDashboardSearchShortcut */
export const isProductSearchShortcut = isDashboardSearchShortcut;
