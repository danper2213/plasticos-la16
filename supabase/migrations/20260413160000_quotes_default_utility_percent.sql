-- Porcentaje de utilidad por defecto al agregar líneas (precio = costo × (1 + utilidad/100)).

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_utility_percent numeric(5, 2) NOT NULL DEFAULT 20;
