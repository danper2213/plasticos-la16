-- Cotización: solo costo + precio unitario editables en línea (sin margen ni % ajuste).

ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS unit_cost numeric(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE quote_lines DROP COLUMN IF EXISTS cost_markup_percent;
ALTER TABLE quote_lines DROP COLUMN IF EXISTS use_global_adjustment;
ALTER TABLE quote_lines DROP COLUMN IF EXISTS line_adjustment_percent;

ALTER TABLE quotes DROP COLUMN IF EXISTS global_adjustment_percent;
ALTER TABLE quotes DROP COLUMN IF EXISTS default_cost_markup_percent;
