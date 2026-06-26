-- Evita comprobantes duplicados si el cliente reintenta el mismo guardado.
ALTER TABLE inventory_movement_batches
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movement_batches_idempotency_key
  ON inventory_movement_batches (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
