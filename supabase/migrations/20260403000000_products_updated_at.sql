-- Asegura columna de auditoría para última edición del producto.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE products
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;
