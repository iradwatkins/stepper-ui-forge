-- Stepping Classes System
-- Enables instructors to create and manage stepping classes and VOD content

-- Create class type enum
CREATE TYPE class_type AS ENUM (
  'Regular Class',
  'Workshop', 
  'Private Lesson',
  'Group Session'
);

-- Create class level enum
CREATE TYPE class_level AS ENUM (
  'Beginner',
  'Intermediate', 
  'Advanced'
);

-- Create class category enum
CREATE TYPE class_category AS ENUM (
  'Stepping',
  'Line Dancing',
  'Walking'
);

-- Create location type enum
CREATE TYPE location_type AS ENUM (
  'physical',
  'online'
);

-- Create schedule type enum
CREATE TYPE schedule_type AS ENUM (
  'single',
  'weekly',
  'monthly',
  'custom'
);

-- Create class status enum
CREATE TYPE class_status AS ENUM (
  'draft',
  'published',
  'cancelled',
  'completed'
);

-- Create stepping classes table
CREATE TABLE stepping_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_name varchar(255) NOT NULL,
  
  -- Basic Information
  title varchar(255) NOT NULL,
  description text NOT NULL,
  class_type class_type NOT NULL,
  level class_level NOT NULL,
  category class_category NOT NULL,
  
  -- Location Information
  location_type location_type NOT NULL,
  venue varchar(255),
  address text,
  city varchar(100),
  state varchar(50),
  zip_code varchar(20),
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  online_link varchar(500),
  special_instructions text,
  
  -- Schedule Information
  schedule_type schedule_type NOT NULL,
  start_date date NOT NULL,
  end_date date,
  class_time time NOT NULL,
  duration_minutes integer NOT NULL,
  days_of_week integer[] DEFAULT '{}', -- 0-6 (Sunday-Saturday) for weekly
  day_of_month integer, -- 1-31 for monthly
  exception_dates date[] DEFAULT '{}', -- cancelled/rescheduled dates
  schedule_notes text,
  
  -- Pricing and Capacity
  price decimal(10,2) NOT NULL DEFAULT 0,
  capacity integer,
  has_rsvp boolean NOT NULL DEFAULT true,
  
  -- Contact Information
  contact_email varchar(255),
  contact_phone varchar(50),
  preferred_contact varchar(20) DEFAULT 'email',
  
  -- Additional Information
  prerequisites text,
  what_to_bring text,
  extras text,
  tags text[] DEFAULT '{}',
  
  -- Status and Visibility
  status class_status NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  
  -- Statistics
  attendee_count integer NOT NULL DEFAULT 0,
  interested_count integer NOT NULL DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0,
  total_ratings integer NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create class images table
CREATE TABLE class_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES stepping_classes(id) ON DELETE CASCADE,
  url varchar(500) NOT NULL,
  alt_text varchar(255),
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Create class attendees table
CREATE TABLE class_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES stepping_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name varchar(255) NOT NULL,
  user_email varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'interested', -- 'interested', 'registered', 'attended', 'cancelled'
  registered_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  
  -- Prevent duplicate registrations
  UNIQUE(class_id, user_id)
);

-- Create VOD classes table for recorded content
CREATE TABLE vod_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_name varchar(255) NOT NULL,
  
  -- Basic Information
  title varchar(255) NOT NULL,
  description text NOT NULL,
  level class_level NOT NULL,
  category class_category NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  
  -- Media
  thumbnail_url varchar(500),
  preview_video_url varchar(500),
  total_duration_minutes integer NOT NULL DEFAULT 0,
  
  -- Metadata
  tags text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  
  -- Statistics
  purchase_count integer NOT NULL DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0,
  total_ratings integer NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create VOD sections table
CREATE TABLE vod_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vod_class_id uuid NOT NULL REFERENCES vod_classes(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  order_index integer NOT NULL,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create VOD videos table
CREATE TABLE vod_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES vod_sections(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  video_url varchar(500) NOT NULL,
  duration_seconds integer NOT NULL,
  order_index integer NOT NULL,
  is_processed boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE stepping_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stepping_classes
CREATE POLICY "Public can view published classes" ON stepping_classes
  FOR SELECT USING (status = 'published' AND is_active = true);

CREATE POLICY "Instructors can create their own classes" ON stepping_classes
  FOR INSERT WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update their own classes" ON stepping_classes
  FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can delete their own classes" ON stepping_classes
  FOR DELETE USING (auth.uid() = instructor_id);

-- RLS Policies for class_images
CREATE POLICY "Public can view images of published classes" ON class_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stepping_classes sc
      WHERE sc.id = class_images.class_id
      AND sc.status = 'published' AND sc.is_active = true
    )
  );

CREATE POLICY "Instructors can manage their class images" ON class_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stepping_classes sc
      WHERE sc.id = class_images.class_id
      AND sc.instructor_id = auth.uid()
    )
  );

-- RLS Policies for class_attendees
CREATE POLICY "Users can view attendees of classes they're registered for" ON class_attendees
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM stepping_classes sc
      WHERE sc.id = class_attendees.class_id
      AND sc.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can register for classes" ON class_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations" ON class_attendees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own registrations" ON class_attendees
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for VOD classes (similar pattern)
CREATE POLICY "Public can view published VOD classes" ON vod_classes
  FOR SELECT USING (is_published = true);

CREATE POLICY "Instructors can manage their own VOD classes" ON vod_classes
  FOR ALL USING (auth.uid() = instructor_id);

-- Create indexes for better performance
CREATE INDEX idx_stepping_classes_instructor ON stepping_classes(instructor_id);
CREATE INDEX idx_stepping_classes_status ON stepping_classes(status);
CREATE INDEX idx_stepping_classes_category ON stepping_classes(category);
CREATE INDEX idx_stepping_classes_level ON stepping_classes(level);
CREATE INDEX idx_stepping_classes_location ON stepping_classes(city, state);
CREATE INDEX idx_stepping_classes_schedule ON stepping_classes(start_date, class_time);
CREATE INDEX idx_stepping_classes_featured ON stepping_classes(is_featured, created_at DESC);

-- Text search index (simplified to avoid immutable function issues)
CREATE INDEX idx_stepping_classes_search ON stepping_classes 
USING gin(to_tsvector('english', title || ' ' || description));

CREATE INDEX idx_class_attendees_class ON class_attendees(class_id);
CREATE INDEX idx_class_attendees_user ON class_attendees(user_id);
CREATE INDEX idx_class_images_class ON class_images(class_id);

-- Create functions for class management
CREATE OR REPLACE FUNCTION update_class_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON stepping_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_class_updated_at();

-- Function to update attendee counts
CREATE OR REPLACE FUNCTION update_class_attendee_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stepping_classes
  SET 
    attendee_count = (
      SELECT COUNT(*)
      FROM class_attendees
      WHERE class_id = COALESCE(NEW.class_id, OLD.class_id)
      AND status = 'registered'
    ),
    interested_count = (
      SELECT COUNT(*)
      FROM class_attendees
      WHERE class_id = COALESCE(NEW.class_id, OLD.class_id)
      AND status = 'interested'
    )
  WHERE id = COALESCE(NEW.class_id, OLD.class_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for attendee count updates
CREATE TRIGGER update_class_attendee_counts_on_insert
  AFTER INSERT ON class_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_class_attendee_counts();

CREATE TRIGGER update_class_attendee_counts_on_update
  AFTER UPDATE ON class_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_class_attendee_counts();

CREATE TRIGGER update_class_attendee_counts_on_delete
  AFTER DELETE ON class_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_class_attendee_counts();

-- Function to ensure only one primary image per class
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other images for this class to not primary
    UPDATE class_images 
    SET is_primary = false 
    WHERE class_id = NEW.class_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_image_trigger
  BEFORE INSERT OR UPDATE ON class_images
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_image();