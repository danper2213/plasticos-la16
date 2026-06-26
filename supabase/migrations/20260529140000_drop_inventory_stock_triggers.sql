-- Elimina TODOS los triggers en inventory_movements (nombres desconocidos incluidos).
-- Si queda alguno, al insertar un movimiento el stock se mueve dos veces (app + trigger).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname AS name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'inventory_movements'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.inventory_movements', r.name);
    RAISE NOTICE 'Dropped trigger % on inventory_movements', r.name;
  END LOOP;
END $$;

-- Funciones sueltas que a veces quedan huérfanas
DROP FUNCTION IF EXISTS public.update_product_stock_on_movement() CASCADE;
DROP FUNCTION IF EXISTS public.apply_inventory_movement_to_stock() CASCADE;
DROP FUNCTION IF EXISTS public.handle_inventory_movement() CASCADE;
DROP FUNCTION IF EXISTS public.sync_stock_from_movement() CASCADE;
