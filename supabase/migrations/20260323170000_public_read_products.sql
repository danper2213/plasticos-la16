ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active products" ON products;
CREATE POLICY "Public read active products"
  ON products FOR SELECT TO anon
  USING (is_active = true);
