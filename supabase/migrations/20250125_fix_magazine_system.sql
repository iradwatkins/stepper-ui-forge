-- Fix Magazine System Tables and Policies


-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read categories" ON magazine_categories;
DROP POLICY IF EXISTS "Public can read published articles" ON magazine_articles;
DROP POLICY IF EXISTS "Admins can manage categories" ON magazine_categories;
DROP POLICY IF EXISTS "Admins can manage articles" ON magazine_articles;
DROP POLICY IF EXISTS "Authors can manage own articles" ON magazine_articles;

-- Create tables if they don't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_magazine_articles_author_id ON magazine_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_category_id ON magazine_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_status ON magazine_articles(status);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_slug ON magazine_articles(slug);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_created_at ON magazine_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magazine_categories_slug ON magazine_categories(slug);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_magazine_categories_updated_at ON magazine_categories;
CREATE TRIGGER update_magazine_categories_updated_at
  BEFORE UPDATE ON magazine_categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_magazine_articles_updated_at ON magazine_articles;
CREATE TRIGGER update_magazine_articles_updated_at
  BEFORE UPDATE ON magazine_articles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE magazine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper admin check
-- Public read access for published articles and all categories
CREATE POLICY "Public can read categories" ON magazine_categories
  FOR SELECT USING (true);

CREATE POLICY "Public can read published articles" ON magazine_articles
  FOR SELECT USING (status = 'published');

-- Admin full access (checks is_admin column if it exists, otherwise checks admin function)
CREATE POLICY "Admins can manage categories" ON magazine_categories
  FOR ALL USING (
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
      ) THEN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
      ELSE EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'iradwatkins@gmail.com'
      )
    END
  );

CREATE POLICY "Admins can manage articles" ON magazine_articles
  FOR ALL USING (
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
      ) THEN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
      ELSE EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'iradwatkins@gmail.com'
      )
    END
  );

-- Authors can manage their own articles
CREATE POLICY "Authors can manage own articles" ON magazine_articles
  FOR ALL USING (author_id = auth.uid());

-- Insert sample categories if none exist
INSERT INTO magazine_categories (name, slug, description) 
SELECT * FROM (VALUES
  ('Community Spotlight', 'community-spotlight', 'Featuring amazing stories from our stepping community members and organizers'),
  ('Event Coverage', 'event-coverage', 'In-depth coverage of stepping events, competitions, and performances'),
  ('Dance Tutorials', 'dance-tutorials', 'Step-by-step tutorials and technique breakdowns from experienced steppers'),
  ('Stepping Culture', 'stepping-culture', 'Exploring the rich history and culture of stepping traditions')
) AS v(name, slug, description)
WHERE NOT EXISTS (SELECT 1 FROM magazine_categories LIMIT 1);

-- Create or replace function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to calculate read time
CREATE OR REPLACE FUNCTION calculate_read_time(blocks JSONB)
RETURNS INTEGER AS $$
DECLARE
  total_words INTEGER := 0;
  block JSONB;
  content TEXT;
BEGIN
  FOR block IN SELECT * FROM jsonb_array_elements(blocks)
  LOOP
    content := block->>'content';
    IF content IS NOT NULL THEN
      total_words := total_words + array_length(string_to_array(content, ' '), 1);
    END IF;
  END LOOP;
  
  -- Average reading speed: 200 words per minute
  RETURN GREATEST(1, CEIL(total_words::NUMERIC / 200));
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to set slug
CREATE OR REPLACE FUNCTION set_slug_from_title()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := generate_slug(NEW.title);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to set read time
CREATE OR REPLACE FUNCTION set_read_time_from_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.read_time_minutes := calculate_read_time(NEW.content_blocks);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for slug generation
DROP TRIGGER IF EXISTS auto_generate_slug ON magazine_articles;
CREATE TRIGGER auto_generate_slug
  BEFORE INSERT ON magazine_articles
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE PROCEDURE set_slug_from_title();

-- Create trigger for read time calculation
DROP TRIGGER IF EXISTS update_read_time ON magazine_articles;
CREATE TRIGGER update_read_time
  BEFORE INSERT OR UPDATE ON magazine_articles
  FOR EACH ROW
  WHEN (NEW.content_blocks IS NOT NULL)
  EXECUTE PROCEDURE set_read_time_from_content();