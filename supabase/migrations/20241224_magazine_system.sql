-- Magazine Categories Table
CREATE TABLE magazine_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Magazine Articles Table
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

-- Create indexes for performance
CREATE INDEX idx_magazine_articles_author_id ON magazine_articles(author_id);
CREATE INDEX idx_magazine_articles_category_id ON magazine_articles(category_id);
CREATE INDEX idx_magazine_articles_status ON magazine_articles(status);
CREATE INDEX idx_magazine_articles_slug ON magazine_articles(slug);
CREATE INDEX idx_magazine_articles_created_at ON magazine_articles(created_at DESC);
CREATE INDEX idx_magazine_categories_slug ON magazine_categories(slug);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_magazine_categories_updated_at
  BEFORE UPDATE ON magazine_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_magazine_articles_updated_at
  BEFORE UPDATE ON magazine_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE magazine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles and all categories
CREATE POLICY "Public can read categories" ON magazine_categories
  FOR SELECT USING (true);

CREATE POLICY "Public can read published articles" ON magazine_articles
  FOR SELECT USING (status = 'published');

-- Admin full access (checks is_admin column)
CREATE POLICY "Admins can manage categories" ON magazine_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage articles" ON magazine_articles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Authors can manage their own articles
CREATE POLICY "Authors can manage own articles" ON magazine_articles
  FOR ALL USING (author_id = auth.uid());

-- Insert sample categories
INSERT INTO magazine_categories (name, slug, description) VALUES
('Community Spotlight', 'community-spotlight', 'Featuring amazing stories from our stepping community members and organizers'),
('Event Coverage', 'event-coverage', 'In-depth coverage of stepping events, competitions, and performances'),
('Dance Tutorials', 'dance-tutorials', 'Step-by-step tutorials and technique breakdowns from experienced steppers'),
('Stepping Culture', 'stepping-culture', 'Exploring the rich history and culture of stepping traditions');

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate read time from content blocks
CREATE OR REPLACE FUNCTION calculate_read_time(content_blocks JSONB)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER := 0;
  video_time INTEGER := 0;
  block JSONB;
  content TEXT;
  start_time INTEGER;
  end_time INTEGER;
  block_type TEXT;
BEGIN
  -- Loop through content blocks and count words/video time
  FOR block IN SELECT jsonb_array_elements(content_blocks)
  LOOP
    block_type := block->>'type';
    content := block->>'content';
    
    -- Handle video blocks differently - add their duration to read time
    IF block_type IN ('youtube_video', 'embedded_video') THEN
      start_time := COALESCE((block->>'startTime')::INTEGER, 0);
      end_time := (block->>'endTime')::INTEGER;
      
      -- If end time is specified, use the duration, otherwise assume 3 minutes default
      IF end_time IS NOT NULL THEN
        video_time := video_time + GREATEST(0, end_time - start_time);
      ELSE
        video_time := video_time + 180; -- 3 minutes default for videos without end time
      END IF;
    ELSIF content IS NOT NULL THEN
      -- Strip HTML tags and count words for text content
      content := regexp_replace(content, '<[^>]*>', '', 'g');
      word_count := word_count + array_length(string_to_array(trim(content), ' '), 1);
    END IF;
  END LOOP;
  
  -- Calculate total read time: text (200 words/min) + video time (seconds)
  RETURN GREATEST(1, CEIL(word_count::FLOAT / 200) + CEIL(video_time::FLOAT / 60));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug and calculate read time
CREATE OR REPLACE FUNCTION auto_update_article_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-generate slug if not provided or if title changed
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := generate_slug(NEW.title);
    
    -- Ensure slug uniqueness
    WHILE EXISTS (SELECT 1 FROM magazine_articles WHERE slug = NEW.slug AND id != COALESCE(NEW.id, 0)) LOOP
      NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
    END LOOP;
  END IF;
  
  -- Auto-calculate read time from content blocks
  IF NEW.content_blocks IS NOT NULL THEN
    NEW.read_time_minutes := calculate_read_time(NEW.content_blocks);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_article_fields_trigger
  BEFORE INSERT OR UPDATE ON magazine_articles
  FOR EACH ROW EXECUTE FUNCTION auto_update_article_fields();

-- Same trigger for categories
CREATE OR REPLACE FUNCTION auto_update_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND OLD.name != NEW.name) THEN
    NEW.slug := generate_slug(NEW.name);
    
    -- Ensure slug uniqueness
    WHILE EXISTS (SELECT 1 FROM magazine_categories WHERE slug = NEW.slug AND id != COALESCE(NEW.id, 0)) LOOP
      NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_category_slug_trigger
  BEFORE INSERT OR UPDATE ON magazine_categories
  FOR EACH ROW EXECUTE FUNCTION auto_update_category_slug();