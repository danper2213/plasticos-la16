-- Ajuste atómico de stock (evita lecturas desincronizadas y doble resta).
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id uuid,
  p_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new numeric;
BEGIN
  UPDATE products
  SET
    stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + p_delta),
    updated_at = now()
  WHERE id = p_product_id
  RETURNING stock_quantity INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto % no encontrado', p_product_id;
  END IF;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, numeric) TO authenticated;
