-- Social posts catalog for dashboard management
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text,
  media_url text NOT NULL,
  media_path text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access social_posts" ON social_posts;
CREATE POLICY "Authenticated full access social_posts"
  ON social_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read social_posts" ON social_posts;
CREATE POLICY "Public read social_posts"
  ON social_posts FOR SELECT TO anon USING (true);

-- Public bucket for social media assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-content', 'social-content', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read social-content objects" ON storage.objects;
CREATE POLICY "Public read social-content objects"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'social-content');

DROP POLICY IF EXISTS "Authenticated upload social-content objects" ON storage.objects;
CREATE POLICY "Authenticated upload social-content objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-content');

DROP POLICY IF EXISTS "Authenticated delete social-content objects" ON storage.objects;
CREATE POLICY "Authenticated delete social-content objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'social-content');
