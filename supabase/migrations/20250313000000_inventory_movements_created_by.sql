-- Registro de qué usuario realizó cada movimiento de inventario.
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by_email text;

COMMENT ON COLUMN inventory_movements.created_by_email IS 'Email del usuario que registró el movimiento (denormalizado para mostrar en listado).';
