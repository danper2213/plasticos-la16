-- Costo por línea y margen % sobre costo (precio lista = costo × (1 + margen/100)).
-- Margen por defecto al agregar productos (normalmente 20%).

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS default_cost_markup_percent numeric(10, 2) NOT NULL DEFAULT 20;

ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS unit_cost numeric(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS cost_markup_percent numeric(10, 2) NOT NULL DEFAULT 20;
