ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Public read suppliers for website" ON suppliers;
CREATE POLICY "Public read suppliers for website"
  ON suppliers FOR SELECT TO anon
  USING (is_active = true AND show_on_website = true);
