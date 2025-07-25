-- Fix Magazine System RLS Policies
-- This migration fixes the "permission denied for table users" error by ensuring RLS policies reference the profiles table correctly

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read categories" ON magazine_categories;
DROP POLICY IF EXISTS "Public can read published articles" ON magazine_articles;
DROP POLICY IF EXISTS "Admins can manage categories" ON magazine_categories;
DROP POLICY IF EXISTS "Admins can manage articles" ON magazine_articles;
DROP POLICY IF EXISTS "Authors can manage own articles" ON magazine_articles;

-- Recreate policies with proper references

-- Public read access for categories
CREATE POLICY "Public can read categories" ON magazine_categories
  FOR SELECT USING (true);

-- Public read access for published articles
CREATE POLICY "Public can read published articles" ON magazine_articles
  FOR SELECT USING (status = 'published');

-- Admin full access for categories
CREATE POLICY "Admins can manage categories" ON magazine_categories
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Admin full access for articles
CREATE POLICY "Admins can manage articles" ON magazine_articles
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Authors can manage their own articles
CREATE POLICY "Authors can manage own articles" ON magazine_articles
  FOR ALL USING (
    author_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT ON magazine_categories TO authenticated;
GRANT SELECT ON magazine_articles TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON magazine_categories TO service_role;
GRANT ALL ON magazine_articles TO service_role;
GRANT ALL ON SEQUENCE magazine_categories_id_seq TO service_role;
GRANT ALL ON SEQUENCE magazine_articles_id_seq TO service_role;