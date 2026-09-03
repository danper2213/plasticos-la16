-- Registro diario unificado: venta SAMIT, efectivo, transferencias, gastos y pagos.
-- Un solo registro por fecha. El saldo a arrastrar se calcula en la app
-- (saldo anterior + efectivo + transferencias − gastos − pagos).

CREATE TABLE IF NOT EXISTS public.daily_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_date date NOT NULL,
  previous_balance numeric NOT NULL DEFAULT 0,
  samit_sales_total numeric NOT NULL DEFAULT 0 CHECK (samit_sales_total >= 0),
  cash_total numeric NOT NULL DEFAULT 0 CHECK (cash_total >= 0),
  transfers_total numeric NOT NULL DEFAULT 0 CHECK (transfers_total >= 0),
  expenses_total numeric NOT NULL DEFAULT 0 CHECK (expenses_total >= 0),
  payments_total numeric NOT NULL DEFAULT 0 CHECK (payments_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_registers_register_date_key UNIQUE (register_date)
);

CREATE INDEX IF NOT EXISTS daily_registers_register_date_idx
  ON public.daily_registers (register_date DESC);

ALTER TABLE public.daily_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admin can manage daily_registers"
  ON public.daily_registers;

CREATE POLICY "Only admin can manage daily_registers"
  ON public.daily_registers
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

COMMENT ON TABLE public.daily_registers IS
  'Cierre unificado del día: venta SAMIT, efectivo, transferencias, gastos y pagos. Saldo anterior se arrastra.';
