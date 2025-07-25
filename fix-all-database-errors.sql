-- Comprehensive Database Fix Script
-- Fixes all permission errors, missing columns, and RPC functions
-- Run this in Supabase SQL Editor to resolve all issues

-- 1. Fix missing permission column in profiles table
DO $$ 
BEGIN
  -- Check if permission column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'permission'
  ) THEN
    -- Add permission column if it doesn't exist
    ALTER TABLE profiles ADD COLUMN permission TEXT DEFAULT 'user';
    
    -- Update existing admin users to have admin permission
    UPDATE profiles SET permission = 'admin' WHERE is_admin = true;
  END IF;
END $$;

-- 2. Create missing get_admin_permissions RPC function
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_admin_permissions(UUID);

-- Ensure admin_level column exists in profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'admin_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_level INTEGER DEFAULT 0;
  END IF;
END $$;

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
  -- Get the profile record
  SELECT 
    COALESCE(p.is_admin, false) as is_admin,
    COALESCE(p.admin_level, 0) as admin_level
  INTO profile_record
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Return the results or defaults if no profile found
  IF profile_record IS NOT NULL THEN
    RETURN QUERY SELECT profile_record.is_admin, profile_record.admin_level;
  ELSE
    RETURN QUERY SELECT false::boolean, 0::integer;
  END IF;
END;
$$;

-- 3. Fix magazine system permissions
-- First ensure tables exist with proper structure
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
    
    -- Enable RLS
    ALTER TABLE magazine_categories ENABLE ROW LEVEL SECURITY;
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
    
    -- Enable RLS
    ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;
    
    -- Create indexes
    CREATE INDEX idx_magazine_articles_author_id ON magazine_articles(author_id);
    CREATE INDEX idx_magazine_articles_category_id ON magazine_articles(category_id);
    CREATE INDEX idx_magazine_articles_status ON magazine_articles(status);
  END IF;
END $$;

-- Drop and recreate magazine RLS policies
DROP POLICY IF EXISTS "anyone_read_categories" ON magazine_categories;
DROP POLICY IF EXISTS "anyone_read_published_articles" ON magazine_articles;
DROP POLICY IF EXISTS "admin_manage_categories" ON magazine_categories;
DROP POLICY IF EXISTS "admin_author_manage_articles" ON magazine_articles;

-- Recreate with simpler, working policies
CREATE POLICY "anyone_read_categories" ON magazine_categories
  FOR SELECT USING (true);

CREATE POLICY "anyone_read_published_articles" ON magazine_articles
  FOR SELECT USING (status = 'published');

CREATE POLICY "admin_manage_categories" ON magazine_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "admin_author_manage_articles" ON magazine_articles
  FOR ALL USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- 4. Fix follower_promotions table structure
DO $$
BEGIN
  -- Check if follower_promotions exists with correct structure
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follower_promotions') THEN
    -- Check if organizer_id column exists and add foreign key if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'follower_promotions' AND column_name = 'organizer_id'
    ) THEN
      -- Add organizer_id column if missing
      ALTER TABLE follower_promotions ADD COLUMN organizer_id UUID REFERENCES profiles(id);
    END IF;
    
    -- Ensure the foreign key relationship exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'follower_promotions' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'fk_follower_promotions_organizer'
    ) THEN
      -- Add foreign key constraint if missing
      ALTER TABLE follower_promotions 
      ADD CONSTRAINT fk_follower_promotions_organizer 
      FOREIGN KEY (organizer_id) REFERENCES profiles(id);
    END IF;
  END IF;
END $$;

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON magazine_categories TO authenticated, anon;
GRANT SELECT ON magazine_articles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON magazine_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON magazine_articles TO authenticated;

-- Grant sequence permissions if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'magazine_categories_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE magazine_categories_id_seq TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'magazine_articles_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE magazine_articles_id_seq TO authenticated;
  END IF;
END $$;

-- 6. Insert default magazine categories if none exist
INSERT INTO magazine_categories (name, slug, description) 
SELECT * FROM (VALUES
  ('Community Spotlight', 'community-spotlight', 'Featuring amazing stories from our stepping community members and organizers'),
  ('Event Coverage', 'event-coverage', 'In-depth coverage of stepping events, competitions, and performances'),
  ('Dance Tutorials', 'dance-tutorials', 'Step-by-step tutorials and technique breakdowns from experienced steppers'),
  ('Stepping Culture', 'stepping-culture', 'Exploring the rich history and culture of stepping traditions')
) AS v(name, slug, description)
WHERE NOT EXISTS (SELECT 1 FROM magazine_categories LIMIT 1);

-- 7. Create helper function for checking admin status
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND is_admin = true
  );
END;
$$;

-- 8. Refresh the schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All database fixes have been applied successfully!';
END $$;