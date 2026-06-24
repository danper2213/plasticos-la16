/** Atajo global para enfocar la búsqueda de productos (layout ES/US). */
export function isProductSearchShortcut(event: KeyboardEvent): boolean {
  if (event.altKey) return false;

  const key = event.key;
  const withMod = event.ctrlKey || event.metaKey;

  // Ctrl+/ o Cmd+/ (también con Shift en teclado latino)
  if (withMod && key === "/") return true;

  // Ctrl+Shift+K — alternativa que no abre la barra de Google (Ctrl+K)
  if (withMod && event.shiftKey && key.toLowerCase() === "k") return true;

  // / directo: tecla Slash (US) o Shift+7 (ES latino → key "/")
  if (!withMod && (key === "/" || event.code === "Slash")) return true;

  return false;
}

export function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
