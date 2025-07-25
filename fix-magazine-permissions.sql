-- Emergency fix for Magazine System permissions
-- Apply this immediately to resolve permission errors

-- First, ensure the tables exist
DO $$ 
BEGIN
  -- Check if magazine_categories exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'magazine_categories') THEN
    CREATE TABLE magazine_categories (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  END IF;

  -- Check if magazine_articles exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'magazine_articles') THEN
    CREATE TABLE magazine_articles (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT,
      featured_image TEXT,
      author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      category_id BIGINT REFERENCES magazine_categories(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      content_blocks JSONB DEFAULT '[]'::jsonb,
      read_time_minutes INTEGER DEFAULT 5,
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE magazine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can read categories" ON magazine_categories;
DROP POLICY IF EXISTS "Public can read published articles" ON magazine_articles;
DROP POLICY IF EXISTS "Admins can manage categories" ON magazine_categories;
DROP POLICY IF EXISTS "Admins can manage articles" ON magazine_articles;
DROP POLICY IF EXISTS "Authors can manage own articles" ON magazine_articles;

-- Create simplified policies that work

-- Everyone can read categories
CREATE POLICY "anyone_read_categories" ON magazine_categories
  FOR SELECT USING (true);

-- Everyone can read published articles
CREATE POLICY "anyone_read_published_articles" ON magazine_articles
  FOR SELECT USING (status = 'published');

-- Authenticated users can manage categories if admin
CREATE POLICY "admin_manage_categories" ON magazine_categories
  FOR ALL USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Authenticated users can manage articles if admin or author
CREATE POLICY "admin_author_manage_articles" ON magazine_articles
  FOR ALL USING (
    auth.uid() IS NOT NULL 
    AND (
      author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    )
  );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON magazine_categories TO authenticated, anon;
GRANT SELECT ON magazine_articles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON magazine_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON magazine_articles TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE magazine_categories_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE magazine_articles_id_seq TO authenticated;

-- Insert default categories if none exist
INSERT INTO magazine_categories (name, slug, description) 
SELECT * FROM (VALUES
  ('Community Spotlight', 'community-spotlight', 'Featuring amazing stories from our stepping community members and organizers'),
  ('Event Coverage', 'event-coverage', 'In-depth coverage of stepping events, competitions, and performances'),
  ('Dance Tutorials', 'dance-tutorials', 'Step-by-step tutorials and technique breakdowns from experienced steppers'),
  ('Stepping Culture', 'stepping-culture', 'Exploring the rich history and culture of stepping traditions')
) AS v(name, slug, description)
WHERE NOT EXISTS (SELECT 1 FROM magazine_categories LIMIT 1);