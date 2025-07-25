-- Add business type distinction to community businesses
-- This migration adds support for different types of listings: businesses vs services

-- Create business type enum
CREATE TYPE business_type AS ENUM (
  'physical_business',    -- Brick-and-mortar stores, restaurants, shops
  'service_provider',     -- Individual service providers (instructors, photographers, etc.)
  'venue',               -- Event venues, studios, halls
  'online_business',     -- E-commerce, digital services
  'mobile_service'       -- Services that travel to customer
);

-- Add business_type column to existing table
ALTER TABLE community_businesses 
ADD COLUMN business_type business_type NOT NULL DEFAULT 'physical_business';

-- Add service-specific fields
ALTER TABLE community_businesses 
ADD COLUMN hourly_rate decimal(10,2),
ADD COLUMN service_rate_type varchar(50) CHECK (service_rate_type IN ('hourly', 'per_project', 'per_session', 'per_day', 'fixed')),
ADD COLUMN min_booking_duration integer, -- in minutes
ADD COLUMN max_booking_duration integer, -- in minutes
ADD COLUMN availability_schedule jsonb DEFAULT '{}', -- Store weekly availability schedule
ADD COLUMN booking_advance_notice integer DEFAULT 24, -- hours notice required
ADD COLUMN accepts_online_booking boolean DEFAULT false,
ADD COLUMN service_offerings text[], -- Array of specific services offered
ADD COLUMN service_area_description text, -- Description of where services are provided
ADD COLUMN travel_fee decimal(10,2), -- Fee for mobile services
ADD COLUMN max_travel_distance integer; -- Maximum travel distance in miles

-- Update existing records to have appropriate business types based on category
UPDATE community_businesses 
SET business_type = CASE 
  WHEN category IN ('education_training', 'professional_services', 'health_wellness', 'beauty_personal_care', 'fitness_sports', 'cleaning_maintenance', 'pet_services') 
    THEN 'service_provider'
  WHEN category = 'entertainment' AND subcategory LIKE '%venue%' 
    THEN 'venue'
  WHEN category = 'technology' AND (description ILIKE '%online%' OR description ILIKE '%digital%' OR description ILIKE '%virtual%')
    THEN 'online_business'
  ELSE 'physical_business'
END;

-- Make location fields conditional based on business type
-- Add constraint to ensure physical businesses have required location info
ALTER TABLE community_businesses 
ADD CONSTRAINT check_physical_business_location 
CHECK (
  (business_type != 'physical_business' AND business_type != 'venue') 
  OR 
  (city IS NOT NULL AND state IS NOT NULL)
);

-- Add constraint to ensure service providers have service-specific info
ALTER TABLE community_businesses 
ADD CONSTRAINT check_service_provider_info 
CHECK (
  business_type != 'service_provider' 
  OR 
  (service_offerings IS NOT NULL OR specialties IS NOT NULL)
);

-- Create indexes for better performance on business type filtering
CREATE INDEX idx_community_businesses_type ON community_businesses(business_type);
CREATE INDEX idx_community_businesses_type_category ON community_businesses(business_type, category);
CREATE INDEX idx_community_businesses_service_area ON community_businesses(service_area_radius) WHERE service_area_radius IS NOT NULL;

-- Update RLS policies to work with business types
-- Add policy for service providers to show service area info
CREATE POLICY "Public can view service provider availability" ON community_businesses
  FOR SELECT USING (
    status = 'approved' AND 
    business_type = 'service_provider' AND 
    accepts_online_booking = true
  );

-- Function to validate business type specific fields
CREATE OR REPLACE FUNCTION validate_business_type_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate physical business requirements
  IF NEW.business_type IN ('physical_business', 'venue') THEN
    IF NEW.city IS NULL OR NEW.state IS NULL THEN
      RAISE EXCEPTION 'Physical businesses and venues must have city and state';
    END IF;
  END IF;
  
  -- Validate service provider requirements
  IF NEW.business_type = 'service_provider' THEN
    IF NEW.service_offerings IS NULL AND NEW.specialties IS NULL THEN
      RAISE EXCEPTION 'Service providers must specify service offerings or specialties';
    END IF;
    
    -- Set default service area for service providers if not specified
    IF NEW.service_area_radius IS NULL THEN
      NEW.service_area_radius = 25;
    END IF;
  END IF;
  
  -- Validate online business requirements
  IF NEW.business_type = 'online_business' THEN
    IF NEW.website_url IS NULL AND NEW.contact_email IS NULL THEN
      RAISE EXCEPTION 'Online businesses must have website URL or contact email';
    END IF;
  END IF;
  
  -- Validate mobile service requirements
  IF NEW.business_type = 'mobile_service' THEN
    IF NEW.service_area_radius IS NULL THEN
      NEW.service_area_radius = 50; -- Default 50 mile radius for mobile services
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for business type validation
CREATE TRIGGER validate_business_type_trigger
  BEFORE INSERT OR UPDATE ON community_businesses
  FOR EACH ROW
  EXECUTE FUNCTION validate_business_type_fields();

-- Update the search index to include business type
DROP INDEX IF EXISTS idx_community_businesses_search;
CREATE INDEX idx_community_businesses_search ON community_businesses 
USING gin(to_tsvector('english', business_name || ' ' || description || ' ' || business_type::text));

-- Add helpful comments
COMMENT ON COLUMN community_businesses.business_type IS 'Type of business listing: physical_business, service_provider, venue, online_business, or mobile_service';
COMMENT ON COLUMN community_businesses.hourly_rate IS 'Hourly rate for service providers';
COMMENT ON COLUMN community_businesses.service_rate_type IS 'How the service is priced: hourly, per_project, per_session, per_day, or fixed';
COMMENT ON COLUMN community_businesses.service_offerings IS 'Array of specific services offered by service providers';
COMMENT ON COLUMN community_businesses.accepts_online_booking IS 'Whether the business accepts online booking/scheduling';
COMMENT ON COLUMN community_businesses.travel_fee IS 'Additional fee for mobile services that travel to customer';