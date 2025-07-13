-- Community Businesses and Services Table
-- Allows community members to list their businesses and services

-- Create business categories enum
CREATE TYPE business_category AS ENUM (
  'food_beverage',
  'health_wellness',
  'beauty_personal_care',
  'fitness_sports',
  'education_training',
  'professional_services',
  'home_garden',
  'automotive',
  'technology',
  'arts_crafts',
  'entertainment',
  'retail_shopping',
  'real_estate',
  'financial_services',
  'childcare_family',
  'pet_services',
  'cleaning_maintenance',
  'event_services',
  'travel_hospitality',
  'other'
);

-- Create business status enum
CREATE TYPE business_status AS ENUM (
  'pending',
  'approved',
  'suspended',
  'rejected'
);

-- Create community businesses table
CREATE TABLE community_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name varchar(255) NOT NULL,
  description text NOT NULL,
  category business_category NOT NULL,
  subcategory varchar(100),
  
  -- Contact Information
  contact_email varchar(255),
  contact_phone varchar(50),
  website_url varchar(500),
  social_media jsonb DEFAULT '{}', -- Store multiple social media links
  
  -- Location Information
  address text,
  city varchar(100),
  state varchar(50),
  zip_code varchar(20),
  country varchar(100) DEFAULT 'United States',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  service_area_radius integer, -- in miles, NULL for online-only services
  
  -- Business Details
  business_hours jsonb DEFAULT '{}', -- Store weekly schedule
  price_range varchar(20) CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  tags text[] DEFAULT '{}',
  specialties text[] DEFAULT '{}',
  
  -- Media
  logo_url varchar(500),
  cover_image_url varchar(500),
  gallery_images text[] DEFAULT '{}',
  
  -- Verification and Status
  status business_status NOT NULL DEFAULT 'pending',
  is_verified boolean NOT NULL DEFAULT false,
  verification_date timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  
  -- SEO and Discovery
  slug varchar(255) UNIQUE,
  keywords text[] DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  featured_until timestamptz,
  
  -- Metrics
  view_count integer NOT NULL DEFAULT 0,
  contact_count integer NOT NULL DEFAULT 0,
  rating_average decimal(3,2) DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

-- Create business reviews table
CREATE TABLE business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES community_businesses(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  helpful_count integer NOT NULL DEFAULT 0,
  verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate reviews from same user
  UNIQUE(business_id, reviewer_id)
);

-- Create business inquiries/contacts table
CREATE TABLE business_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES community_businesses(id) ON DELETE CASCADE,
  inquirer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  inquirer_email varchar(255) NOT NULL,
  inquirer_name varchar(255) NOT NULL,
  inquirer_phone varchar(50),
  subject varchar(255),
  message text NOT NULL,
  inquiry_type varchar(50) DEFAULT 'general', -- 'general', 'quote', 'booking', 'partnership'
  status varchar(20) DEFAULT 'new', -- 'new', 'replied', 'closed'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE community_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_businesses
CREATE POLICY "Public can view approved businesses" ON community_businesses
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create their own businesses" ON community_businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own businesses" ON community_businesses
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own businesses" ON community_businesses
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all businesses" ON community_businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.permission_level = 'admin'
    )
  );

-- RLS Policies for business_reviews
CREATE POLICY "Public can view approved business reviews" ON business_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_businesses cb
      WHERE cb.id = business_reviews.business_id
      AND cb.status = 'approved'
    )
  );

CREATE POLICY "Users can create reviews" ON business_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON business_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON business_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- RLS Policies for business_inquiries
CREATE POLICY "Business owners can view their inquiries" ON business_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_businesses cb
      WHERE cb.id = business_inquiries.business_id
      AND cb.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create inquiries" ON business_inquiries
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_community_businesses_status ON community_businesses(status);
CREATE INDEX idx_community_businesses_category ON community_businesses(category);
CREATE INDEX idx_community_businesses_location ON community_businesses(city, state);
CREATE INDEX idx_community_businesses_owner ON community_businesses(owner_id);
CREATE INDEX idx_community_businesses_featured ON community_businesses(featured, featured_until);
CREATE INDEX idx_community_businesses_slug ON community_businesses(slug);
CREATE INDEX idx_community_businesses_rating ON community_businesses(rating_average DESC);

-- Text search index
CREATE INDEX idx_community_businesses_search ON community_businesses 
USING gin(to_tsvector('english', business_name || ' ' || description || ' ' || COALESCE(array_to_string(tags, ' '), '')));

CREATE INDEX idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX idx_business_reviews_rating ON business_reviews(rating DESC);
CREATE INDEX idx_business_inquiries_business ON business_inquiries(business_id);

-- Create functions for business management
CREATE OR REPLACE FUNCTION update_business_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON community_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_business_updated_at();

-- Function to update business rating when reviews change
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the business rating and count
  UPDATE community_businesses
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating)::decimal(3,2), 0)
      FROM business_reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM business_reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    )
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for rating updates
CREATE TRIGGER update_business_rating_on_review_insert
  AFTER INSERT ON business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rating();

CREATE TRIGGER update_business_rating_on_review_update
  AFTER UPDATE ON business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rating();

CREATE TRIGGER update_business_rating_on_review_delete
  AFTER DELETE ON business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rating();

-- Function to generate slug from business name
CREATE OR REPLACE FUNCTION generate_business_slug(business_name text, business_id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Create base slug from business name
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (
    SELECT 1 FROM community_businesses 
    WHERE slug = final_slug 
    AND id != business_id
  ) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
CREATE OR REPLACE FUNCTION set_business_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_business_slug(NEW.business_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_business_slug_trigger
  BEFORE INSERT OR UPDATE ON community_businesses
  FOR EACH ROW
  EXECUTE FUNCTION set_business_slug();