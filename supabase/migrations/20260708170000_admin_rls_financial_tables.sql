-- Restringe tablas financieras/admin: solo administradores (current_user_is_admin).
-- Reemplaza políticas "Authenticated full access" abiertas a cualquier usuario autenticado.
-- suppliers: lectura para todos los autenticados (dropdown en productos); escritura solo admin.

-- Requiere user_roles; idempotente si ya existe desde 20250309100000.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- bank_accounts
DROP POLICY IF EXISTS "Authenticated full access bank_accounts" ON bank_accounts;
CREATE POLICY "Only admin can manage bank_accounts"
  ON bank_accounts FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- financial_categories
DROP POLICY IF EXISTS "Authenticated full access financial_categories" ON financial_categories;
CREATE POLICY "Only admin can manage financial_categories"
  ON financial_categories FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- daily_transactions
DROP POLICY IF EXISTS "Authenticated full access daily_transactions" ON daily_transactions;
CREATE POLICY "Only admin can manage daily_transactions"
  ON daily_transactions FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- accounts_payable
DROP POLICY IF EXISTS "Authenticated full access accounts_payable" ON accounts_payable;
CREATE POLICY "Only admin can manage accounts_payable"
  ON accounts_payable FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- payable_payments
DROP POLICY IF EXISTS "Authenticated full access payable_payments" ON payable_payments;
CREATE POLICY "Only admin can manage payable_payments"
  ON payable_payments FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- daily_closures
DROP POLICY IF EXISTS "Authenticated full access daily_closures" ON daily_closures;
CREATE POLICY "Only admin can manage daily_closures"
  ON daily_closures FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- daily_expenses
DROP POLICY IF EXISTS "Authenticated full access daily_expenses" ON daily_expenses;
CREATE POLICY "Only admin can manage daily_expenses"
  ON daily_expenses FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- samit_closures
DROP POLICY IF EXISTS "Authenticated full access samit_closures" ON samit_closures;
CREATE POLICY "Only admin can manage samit_closures"
  ON samit_closures FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- suppliers: lectura para autenticados (productos); mutaciones solo admin
DROP POLICY IF EXISTS "Authenticated full access suppliers" ON suppliers;
CREATE POLICY "Authenticated can read suppliers"
  ON suppliers FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Only admin can insert suppliers"
  ON suppliers FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Only admin can update suppliers"
  ON suppliers FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Only admin can delete suppliers"
  ON suppliers FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

-- public_settings: anon ya tiene SELECT; mutaciones autenticadas solo admin
DROP POLICY IF EXISTS "Authenticated full access public_settings" ON public_settings;
CREATE POLICY "Only admin can manage public_settings"
  ON public_settings FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- newsletter_subscribers: anon ya tiene INSERT; gestión autenticada solo admin
DROP POLICY IF EXISTS "Authenticated full access newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "Only admin can manage newsletter_subscribers"
  ON newsletter_subscribers FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
