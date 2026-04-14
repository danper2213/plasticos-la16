-- Comprobantes de inventario: un registro por guardado (varios productos), tipo factura.
CREATE TABLE IF NOT EXISTS inventory_movement_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date date NOT NULL,
  notes text,
  created_by_user_id uuid REFERENCES auth.users (id),
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory_movement_batches IS 'Encabezado de un guardado de inventario (múltiples líneas en inventory_movements).';

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES inventory_movement_batches (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch_id ON inventory_movements (batch_id);

ALTER TABLE inventory_movement_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access inventory_movement_batches" ON inventory_movement_batches;

CREATE POLICY "Authenticated full access inventory_movement_batches"
  ON inventory_movement_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
