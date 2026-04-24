-- Código escaneable estable por producto (1D/QR). Mismo valor para kiosco e impresión de etiquetas.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS scan_code text;

UPDATE products
SET scan_code = 'PL16-' || REPLACE(id::text, '-', '')
WHERE scan_code IS NULL OR btrim(scan_code) = '';

ALTER TABLE products
  ALTER COLUMN scan_code SET NOT NULL;

DROP INDEX IF EXISTS products_scan_code_key;
CREATE UNIQUE INDEX products_scan_code_key ON products (scan_code);

CREATE OR REPLACE FUNCTION public.products_set_scan_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scan_code IS NULL OR btrim(NEW.scan_code) = '' THEN
    NEW.scan_code := 'PL16-' || REPLACE(NEW.id::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_scan_code_before_insert ON public.products;
CREATE TRIGGER products_set_scan_code_before_insert
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE PROCEDURE public.products_set_scan_code();
