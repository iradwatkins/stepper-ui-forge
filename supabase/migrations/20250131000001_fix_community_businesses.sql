-- Add missing business_type column and enum
-- Also add service-provider specific fields

-- Create business type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE business_type AS ENUM (
      'physical_business',
      'service_provider',
      'venue',
      'online_business',
      'mobile_service'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create service rate type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE service_rate_type AS ENUM (
      'hourly',
      'per_project',
      'per_session',
      'per_day',
      'fixed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to community_businesses table
ALTER TABLE community_businesses 
ADD COLUMN IF NOT EXISTS business_type business_type NOT NULL DEFAULT 'physical_business',
ADD COLUMN IF NOT EXISTS hourly_rate decimal(10,2),
ADD COLUMN IF NOT EXISTS service_rate_type service_rate_type,
ADD COLUMN IF NOT EXISTS min_booking_duration integer, -- in minutes
ADD COLUMN IF NOT EXISTS max_booking_duration integer, -- in minutes
ADD COLUMN IF NOT EXISTS availability_schedule jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS booking_advance_notice integer DEFAULT 24, -- hours
ADD COLUMN IF NOT EXISTS accepts_online_booking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS service_offerings text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS service_area_description text,
ADD COLUMN IF NOT EXISTS travel_fee decimal(10,2),
ADD COLUMN IF NOT EXISTS max_travel_distance integer; -- miles

-- Create RPC functions for increment operations
CREATE OR REPLACE FUNCTION increment_business_views(business_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_businesses
  SET view_count = view_count + 1
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_business_contacts(business_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_businesses
  SET contact_count = contact_count + 1
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION increment_business_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_business_contacts(uuid) TO authenticated;

-- Fix the RLS policy to allow users to view their own businesses regardless of status
CREATE POLICY "Users can view their own businesses" ON community_businesses
  FOR SELECT USING (auth.uid() = owner_id);

-- Ensure authenticated users can insert into community_businesses
CREATE POLICY "Authenticated users can create businesses" ON community_businesses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

-- Fix any missing permissions
GRANT ALL ON community_businesses TO authenticated;
GRANT ALL ON business_reviews TO authenticated;
GRANT ALL ON business_inquiries TO authenticated;

-- Grant usage on the enums
GRANT USAGE ON TYPE business_category TO authenticated;
GRANT USAGE ON TYPE business_status TO authenticated;
GRANT USAGE ON TYPE business_type TO authenticated;
GRANT USAGE ON TYPE service_rate_type TO authenticated;

-- Add composite index for text search to avoid errors
DROP INDEX IF EXISTS idx_community_businesses_search;
CREATE INDEX idx_community_businesses_text_search 
ON community_businesses USING gin(
  (setweight(to_tsvector('english', coalesce(business_name, '')), 'A') ||
   setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
   setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C'))
);