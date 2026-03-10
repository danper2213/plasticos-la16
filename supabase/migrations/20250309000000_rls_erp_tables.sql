-- RLS para tablas del ERP PLASTICOS LA 16
-- Solo usuarios autenticados (Supabase Auth) pueden leer/escribir.
-- Ejecutar en SQL Editor de Supabase cuando el esquema de tablas esté creado.

-- user_roles: solo usuarios autenticados; en el app se filtra por user_id en la query
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Authenticated can manage user_roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated full access user_roles" ON user_roles;
CREATE POLICY "Authenticated full access user_roles"
  ON user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access suppliers" ON suppliers;
CREATE POLICY "Authenticated full access suppliers"
  ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access bank_accounts" ON bank_accounts;
CREATE POLICY "Authenticated full access bank_accounts"
  ON bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- financial_categories
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access financial_categories" ON financial_categories;
CREATE POLICY "Authenticated full access financial_categories"
  ON financial_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- daily_transactions
ALTER TABLE daily_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access daily_transactions" ON daily_transactions;
CREATE POLICY "Authenticated full access daily_transactions"
  ON daily_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- accounts_payable
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access accounts_payable" ON accounts_payable;
CREATE POLICY "Authenticated full access accounts_payable"
  ON accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- payable_payments
ALTER TABLE payable_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access payable_payments" ON payable_payments;
CREATE POLICY "Authenticated full access payable_payments"
  ON payable_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access customers" ON customers;
CREATE POLICY "Authenticated full access customers"
  ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access products" ON products;
CREATE POLICY "Authenticated full access products"
  ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access product_categories" ON product_categories;
CREATE POLICY "Authenticated full access product_categories"
  ON product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access inventory_movements" ON inventory_movements;
CREATE POLICY "Authenticated full access inventory_movements"
  ON inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- accounts_receivable
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access accounts_receivable" ON accounts_receivable;
CREATE POLICY "Authenticated full access accounts_receivable"
  ON accounts_receivable FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- receivable_payments
ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access receivable_payments" ON receivable_payments;
CREATE POLICY "Authenticated full access receivable_payments"
  ON receivable_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- daily_closures
ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access daily_closures" ON daily_closures;
CREATE POLICY "Authenticated full access daily_closures"
  ON daily_closures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- daily_expenses (RLS ya habilitado en 20250308000000; reemplazamos políticas por nombre consistente)
DROP POLICY IF EXISTS "Allow read daily_expenses for authenticated" ON daily_expenses;
DROP POLICY IF EXISTS "Allow insert daily_expenses for authenticated" ON daily_expenses;
DROP POLICY IF EXISTS "Allow delete daily_expenses for authenticated" ON daily_expenses;
DROP POLICY IF EXISTS "Authenticated full access daily_expenses" ON daily_expenses;
CREATE POLICY "Authenticated full access daily_expenses"
  ON daily_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
