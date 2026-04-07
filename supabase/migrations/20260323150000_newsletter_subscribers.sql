CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "Public insert newsletter_subscribers"
  ON newsletter_subscribers FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "Authenticated full access newsletter_subscribers"
  ON newsletter_subscribers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
