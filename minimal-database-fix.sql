-- Minimal Database Fix Script
-- Fixes only the essential errors without constraint conflicts

-- 1. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permission TEXT DEFAULT 'user';

-- Update existing admin users
UPDATE profiles SET permission = 'admin' WHERE is_admin = true AND permission != 'admin';

-- 2. Create RPC function (force recreate)
DROP FUNCTION IF EXISTS get_admin_permissions(UUID);

CREATE OR REPLACE FUNCTION get_admin_permissions(user_id UUID)
RETURNS TABLE (
  is_admin BOOLEAN,
  admin_level INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT 
    COALESCE(p.is_admin, false) as is_admin,
    COALESCE(p.admin_level, 0) as admin_level
  INTO profile_record
  FROM profiles p
  WHERE p.id = user_id;
  
  IF profile_record IS NOT NULL THEN
    RETURN QUERY SELECT profile_record.is_admin, profile_record.admin_level;
  ELSE
    RETURN QUERY SELECT false::boolean, 0::integer;
  END IF;
END;
$$;

-- 3. Create magazine tables if they don't exist
CREATE TABLE IF NOT EXISTS magazine_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS magazine_articles (
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

-- 4. Enable RLS
ALTER TABLE magazine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "anyone_read_categories" ON magazine_categories;
DROP POLICY IF EXISTS "anyone_read_published_articles" ON magazine_articles;
DROP POLICY IF EXISTS "admin_manage_categories" ON magazine_categories;
DROP POLICY IF EXISTS "admin_author_manage_articles" ON magazine_articles;

CREATE POLICY "anyone_read_categories" ON magazine_categories FOR SELECT USING (true);
CREATE POLICY "anyone_read_published_articles" ON magazine_articles FOR SELECT USING (status = 'published');
CREATE POLICY "admin_manage_categories" ON magazine_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);
CREATE POLICY "admin_author_manage_articles" ON magazine_articles FOR ALL USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON magazine_categories TO authenticated, anon;
GRANT SELECT ON magazine_articles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON magazine_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON magazine_articles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Insert default categories
INSERT INTO magazine_categories (name, slug, description) 
SELECT * FROM (VALUES
  ('Community Spotlight', 'community-spotlight', 'Featuring amazing stories from our stepping community'),
  ('Event Coverage', 'event-coverage', 'In-depth coverage of stepping events and competitions'),
  ('Dance Tutorials', 'dance-tutorials', 'Step-by-step tutorials and technique breakdowns'),
  ('Stepping Culture', 'stepping-culture', 'Exploring the rich history and culture of stepping')
) AS v(name, slug, description)
WHERE NOT EXISTS (SELECT 1 FROM magazine_categories LIMIT 1);

-- 8. Refresh schema
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database fixes applied successfully!';
END $$;