-- Aprendizaje de costos desde facturas: mapeo descripción → producto + pack size.
-- Se refuerza con cada confirmación del usuario (varios proveedores / plantillas).

CREATE TABLE IF NOT EXISTS public.invoice_cost_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
  description_fingerprint text NOT NULL,
  sample_description text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  unidades_por_empaque integer CHECK (
    unidades_por_empaque IS NULL OR unidades_por_empaque > 0
  ),
  confirm_count integer NOT NULL DEFAULT 1 CHECK (confirm_count > 0),
  last_unit_cost numeric(18, 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Único por proveedor + fingerprint (PG15+ NULLS NOT DISTINCT)
CREATE UNIQUE INDEX IF NOT EXISTS invoice_cost_learnings_supplier_fp_uidx
  ON public.invoice_cost_learnings (supplier_id, description_fingerprint)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS invoice_cost_learnings_product_id_idx
  ON public.invoice_cost_learnings (product_id);

CREATE INDEX IF NOT EXISTS invoice_cost_learnings_fingerprint_idx
  ON public.invoice_cost_learnings (description_fingerprint);

ALTER TABLE public.invoice_cost_learnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admin can manage invoice_cost_learnings"
  ON public.invoice_cost_learnings;

CREATE POLICY "Only admin can manage invoice_cost_learnings"
  ON public.invoice_cost_learnings
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

COMMENT ON TABLE public.invoice_cost_learnings IS
  'Mapeos confirmados factura→producto y pack size por proveedor/plantilla';
