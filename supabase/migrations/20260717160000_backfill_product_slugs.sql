-- Rellena slug en productos activos sin enlace público (necesario para /productos).
UPDATE public.products
SET slug = 'p-' || replace(id::text, '-', '')
WHERE is_active = true
  AND (slug IS NULL OR btrim(slug) = '');

-- Evita colisiones de slug en altas futuras.
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique
  ON public.products (slug)
  WHERE slug IS NOT NULL;
