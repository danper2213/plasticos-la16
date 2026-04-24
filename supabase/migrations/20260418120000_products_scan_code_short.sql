-- Acorta scan_code: P16- + 10 hex (MD5 del id), ~14 caracteres, estable por producto.
-- Reimprimí etiquetas si ya tenías códigos largos (PL16-…).

CREATE OR REPLACE FUNCTION public.products_set_scan_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scan_code IS NULL OR btrim(NEW.scan_code) = '' THEN
    NEW.scan_code := 'P16-' || upper(substring(md5(NEW.id::text) from 1 for 10));
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.products
SET scan_code = 'P16-' || upper(substring(md5(id::text) from 1 for 10));
