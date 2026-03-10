-- Solo administradores pueden insertar/actualizar/eliminar en user_roles.
-- Todos los autenticados pueden leer (para saber su propio rol).

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

-- Quitar políticas amplias si existen
DROP POLICY IF EXISTS "Authenticated full access user_roles" ON user_roles;

-- Lectura: cualquier autenticado (para que el layout pueda leer su rol)
CREATE POLICY "Authenticated can read user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (true);

-- Escritura: solo admin
CREATE POLICY "Only admin can insert user_roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Only admin can update user_roles"
  ON user_roles FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Only admin can delete user_roles"
  ON user_roles FOR DELETE TO authenticated
  USING (public.current_user_is_admin());
