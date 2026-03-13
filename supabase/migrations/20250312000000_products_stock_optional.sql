-- Stock en bodega es opcional: no todos los productos tienen existencia en bodega.
-- NULL = no aplica / no en bodega; valor numérico = cantidad en bodega.
ALTER TABLE products
  ALTER COLUMN stock_quantity DROP NOT NULL,
  ALTER COLUMN stock_quantity SET DEFAULT NULL;
