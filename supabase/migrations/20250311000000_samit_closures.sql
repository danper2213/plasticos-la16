-- Tabla SAMIT: registro diario con saldo inicial, venta sistema, pagos y total (total = saldo inicial + venta sistema - pagos)
CREATE TABLE IF NOT EXISTS samit_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date date NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  sales_total numeric NOT NULL DEFAULT 0,
  payments_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE samit_closures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access samit_closures" ON samit_closures;
CREATE POLICY "Authenticated full access samit_closures"
  ON samit_closures FOR ALL TO authenticated USING (true) WITH CHECK (true);
