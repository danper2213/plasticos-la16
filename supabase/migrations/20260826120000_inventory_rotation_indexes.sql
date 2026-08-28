-- Índice para reportes de rotación (salidas por período / producto).
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type_date
  ON public.inventory_movements (movement_type, movement_date);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_type_date
  ON public.inventory_movements (product_id, movement_type, movement_date);
