-- Cantidades decimales en inventario (ej. 17,4 kg) y saldo en bodega.
ALTER TABLE inventory_movements
  ALTER COLUMN quantity TYPE numeric(14, 4)
  USING quantity::numeric;

ALTER TABLE products
  ALTER COLUMN stock_quantity TYPE numeric(14, 4)
  USING stock_quantity::numeric;
