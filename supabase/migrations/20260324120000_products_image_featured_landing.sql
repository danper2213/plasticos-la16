-- Imagen y control de "productos destacados" en la landing pública
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS featured_on_landing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_sort_order integer NOT NULL DEFAULT 0;
