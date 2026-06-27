-- Saldo antes/después al registrar cada línea (evita reconstrucción imprecisa).
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS stock_before numeric,
  ADD COLUMN IF NOT EXISTS stock_after numeric;

COMMENT ON COLUMN inventory_movements.stock_before IS 'Existencia en cajas/pacas antes de aplicar esta línea.';
COMMENT ON COLUMN inventory_movements.stock_after IS 'Existencia en cajas/pacas después de aplicar esta línea.';
