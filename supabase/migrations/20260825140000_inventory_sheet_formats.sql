-- Formatos imprimibles de inventario: lista de productos para anotar cantidades a mano.

CREATE TABLE IF NOT EXISTS public.inventory_sheet_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  default_movement_type text CHECK (
    default_movement_type IS NULL
    OR default_movement_type IN ('in', 'out')
  ),
  notes text,
  created_by_user_id uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_sheet_format_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format_id uuid NOT NULL REFERENCES public.inventory_sheet_formats (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (format_id, product_id)
);

CREATE INDEX IF NOT EXISTS inventory_sheet_format_lines_format_id_idx
  ON public.inventory_sheet_format_lines (format_id, sort_order);

ALTER TABLE public.inventory_sheet_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_sheet_format_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access inventory_sheet_formats"
  ON public.inventory_sheet_formats;
CREATE POLICY "Authenticated full access inventory_sheet_formats"
  ON public.inventory_sheet_formats
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access inventory_sheet_format_lines"
  ON public.inventory_sheet_format_lines;
CREATE POLICY "Authenticated full access inventory_sheet_format_lines"
  ON public.inventory_sheet_format_lines
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.inventory_sheet_formats IS
  'Plantillas imprimibles: productos fijos, cantidades a mano, luego foto → entrada/salida.';
COMMENT ON TABLE public.inventory_sheet_format_lines IS
  'Productos de un formato de inventario, en orden de impresión.';
