-- Vista pública de productos: solo columnas seguras (sin cost, stock, supplier_id, scan_code).
-- Anon debe leer la vista, no la tabla products completa.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image text;

CREATE OR REPLACE VIEW public.products_public AS
SELECT
  id,
  name,
  slug,
  presentation,
  packaging,
  image_url,
  meta_title,
  meta_description,
  og_image,
  category_id,
  featured_on_landing,
  featured_sort_order,
  updated_at
FROM public.products
WHERE is_active = true;

GRANT SELECT ON public.products_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public read active products" ON products;

CREATE POLICY "Anon cannot read products table directly"
  ON products FOR SELECT TO anon
  USING (false);
