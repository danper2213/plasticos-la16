export const GA_MEASUREMENT_ID = "G-PNFM0B1WWQ";

/** Mismo texto que el `<script>` de `app/layout.tsx`. Si difiere, la home falla al hidratar. */
export const GOOGLE_TAG_INLINE_SCRIPT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`;

export const GOOGLE_TAG_SNIPPET = `<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script><script>${GOOGLE_TAG_INLINE_SCRIPT}</script>`;

const NEXT_GTAG_SRC_RE = new RegExp(
  `<script async(?:="")? src="https://www\\.googletagmanager\\.com/gtag/js\\?id=${GA_MEASUREMENT_ID}"></script>`,
  "g",
);

const NEXT_GTAG_INLINE_RE = new RegExp(
  `<script>\\s*window\\.dataLayer[\\s\\S]*?gtag\\('config', '${GA_MEASUREMENT_ID}'\\);\\s*</script>`,
  "g",
);

/** Pone el snippet oficial de Google como primer contenido de `<head>` y quita copias posteriores. */
export function placeGoogleTagAtStartOfHead(html: string): string {
  const withoutCopies = html
    .replaceAll("<!-- Google tag (gtag.js) -->", "")
    .replace(NEXT_GTAG_SRC_RE, "")
    .replace(NEXT_GTAG_INLINE_RE, "");

  return withoutCopies.replace(/<head[^>]*>/i, (openTag) => `${openTag}${GOOGLE_TAG_SNIPPET}`);
}
