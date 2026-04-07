-- Enable public read for category names used in public landing hero.
DROP POLICY IF EXISTS "Public read product_categories" ON product_categories;
CREATE POLICY "Public read product_categories"
  ON product_categories
  FOR SELECT
  TO anon
  USING (true);
