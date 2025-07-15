-- Classes System Database Schema
-- This file contains the SQL DDL to create tables for the stepping classes functionality

-- Create enum types
CREATE TYPE class_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');
CREATE TYPE class_category AS ENUM ('Steppin', 'Line Dancing', 'Walking');
CREATE TYPE class_type AS ENUM ('Regular Class', 'Workshop', 'Private Lesson', 'Group Session', 'Master Class', 'Boot Camp');
CREATE TYPE schedule_type AS ENUM ('single', 'weekly', 'monthly', 'custom');
CREATE TYPE location_type AS ENUM ('physical', 'online');
CREATE TYPE attendee_status AS ENUM ('interested', 'registered', 'attended', 'cancelled');

-- Main classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_name VARCHAR(255) NOT NULL,
  class_type class_type NOT NULL DEFAULT 'Regular Class',
  level class_level NOT NULL,
  category class_category NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  capacity INTEGER,
  has_rsvp BOOLEAN DEFAULT true,
  prerequisites TEXT,
  what_to_bring TEXT,
  extras TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_pending BOOLEAN DEFAULT true,
  last_confirmed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attendee_count INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 5.0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class schedules table
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  schedule_type schedule_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  days_of_week INTEGER[], -- 0-6 for Sunday-Saturday
  day_of_month INTEGER, -- 1-31 for monthly classes
  exceptions DATE[], -- dates when class is cancelled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class locations table
CREATE TABLE class_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  location_type location_type NOT NULL,
  venue VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  online_link TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class contact information
CREATE TABLE class_contact_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone VARCHAR(50),
  preferred_contact VARCHAR(10) CHECK (preferred_contact IN ('email', 'phone')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class images table
CREATE TABLE class_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  is_instructor_profile BOOLEAN DEFAULT false, -- true for instructor profile pic
  is_class_logo BOOLEAN DEFAULT false, -- true for class logo
  file_size BIGINT,
  file_type VARCHAR(50),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class attendees table
CREATE TABLE class_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  status attendee_status NOT NULL DEFAULT 'interested',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(class_id, user_id)
);

-- VOD (Video on Demand) classes table
CREATE TABLE vod_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_name VARCHAR(255) NOT NULL,
  level class_level NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- in minutes
  thumbnail_url TEXT,
  preview_video_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  purchase_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 5.0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VOD sections table
CREATE TABLE vod_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vod_class_id UUID NOT NULL REFERENCES vod_classes(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  section_order INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VOD videos table
CREATE TABLE vod_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES vod_sections(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  video_order INTEGER NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class payments table (for tracking class-specific payments)
CREATE TABLE class_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  transaction_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX idx_classes_level ON classes(level);
CREATE INDEX idx_classes_category ON classes(category);
CREATE INDEX idx_classes_is_active ON classes(is_active);
CREATE INDEX idx_classes_created_at ON classes(created_at);
CREATE INDEX idx_class_attendees_class_id ON class_attendees(class_id);
CREATE INDEX idx_class_attendees_user_id ON class_attendees(user_id);
CREATE INDEX idx_class_images_class_id ON class_images(class_id);
CREATE INDEX idx_class_images_is_primary ON class_images(is_primary);
CREATE INDEX idx_vod_classes_instructor_id ON vod_classes(instructor_id);
CREATE INDEX idx_vod_sections_vod_class_id ON vod_sections(vod_class_id);
CREATE INDEX idx_vod_videos_section_id ON vod_videos(section_id);

-- Row Level Security (RLS) policies
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Anyone can view active classes" ON classes FOR SELECT USING (is_active = true);
CREATE POLICY "Instructors can manage their classes" ON classes FOR ALL USING (auth.uid() = instructor_id);
CREATE POLICY "Admins can manage all classes" ON classes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND permission_level = 'admin')
);

-- RLS Policies for class_attendees
CREATE POLICY "Users can view attendees of classes they're enrolled in" ON class_attendees FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM classes WHERE id = class_id AND instructor_id = auth.uid())
);
CREATE POLICY "Users can register themselves for classes" ON class_attendees FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own registration" ON class_attendees FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for class_images
CREATE POLICY "Anyone can view class images" ON class_images FOR SELECT USING (true);
CREATE POLICY "Instructors can manage images for their classes" ON class_images FOR ALL USING (
  EXISTS (SELECT 1 FROM classes WHERE id = class_id AND instructor_id = auth.uid())
);

-- RLS Policies for VOD classes
CREATE POLICY "Anyone can view published VOD classes" ON vod_classes FOR SELECT USING (is_published = true);
CREATE POLICY "Instructors can manage their VOD classes" ON vod_classes FOR ALL USING (auth.uid() = instructor_id);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vod_classes_updated_at BEFORE UPDATE ON vod_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_payments_updated_at BEFORE UPDATE ON class_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();