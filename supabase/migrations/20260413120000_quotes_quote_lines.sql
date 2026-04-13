-- Cotizaciones: cabecera y líneas (precios de lista + ajuste % global o por línea).

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers (id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  notes text,
  valid_until date,
  global_adjustment_percent numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  product_name text NOT NULL,
  presentation text NOT NULL DEFAULT '',
  quantity numeric(14, 4) NOT NULL DEFAULT 1,
  list_unit_price numeric(14, 2) NOT NULL,
  use_global_adjustment boolean NOT NULL DEFAULT true,
  line_adjustment_percent numeric(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON quote_lines (quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes (created_at DESC);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access quotes" ON quotes;
CREATE POLICY "Authenticated full access quotes"
  ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access quote_lines" ON quote_lines;
CREATE POLICY "Authenticated full access quote_lines"
  ON quote_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
