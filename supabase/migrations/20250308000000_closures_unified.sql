-- Cierre unificado: Bloque 1 (ventas/pagos) + Bloque 2 (gastos por categoría, entradas, efectivo)
-- Ejecutar en el SQL Editor del proyecto Supabase (Dashboard → SQL Editor) antes de usar el nuevo formulario.

-- Nuevas columnas en daily_closures (Hoja A)
ALTER TABLE daily_closures
  ADD COLUMN IF NOT EXISTS sales_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payments_total numeric NOT NULL DEFAULT 0;

-- Tabla de gastos por categoría (Hoja B)
CREATE TABLE IF NOT EXISTS daily_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id uuid NOT NULL REFERENCES daily_closures(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  category text NOT NULL CHECK (category IN ('comida', 'transporte', 'compras', 'servicios', 'otros')),
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_closure_id ON daily_expenses(closure_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_category ON daily_expenses(category);

-- RLS (ajustar según tu política de daily_closures)
ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

-- Permitir leer/insertar daily_expenses si el usuario puede leer/insertar daily_closures
-- Ejemplo: políticas que reflejen las de daily_closures (ajusta role o condición)
CREATE POLICY "Allow read daily_expenses for authenticated"
  ON daily_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert daily_expenses for authenticated"
  ON daily_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow delete daily_expenses for authenticated"
  ON daily_expenses FOR DELETE TO authenticated USING (true);
