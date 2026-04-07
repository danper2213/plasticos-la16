CREATE TABLE IF NOT EXISTS public_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_url text,
  instagram_url text,
  tiktok_url text,
  facebook_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public_settings (id, whatsapp_url, instagram_url, tiktok_url, facebook_url)
VALUES (
  1,
  'https://wa.me/3108596540?text=Hola%20PLASTICOS%20LA%2016',
  'https://www.instagram.com/plasticosla16/',
  'https://www.tiktok.com/',
  'https://www.facebook.com/'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read public_settings" ON public_settings;
CREATE POLICY "Public read public_settings"
  ON public_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated full access public_settings" ON public_settings;
CREATE POLICY "Authenticated full access public_settings"
  ON public_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
