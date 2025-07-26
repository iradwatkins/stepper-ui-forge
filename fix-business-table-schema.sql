-- Fix community_businesses table schema
-- This adds the missing columns and enums that are required for the business creation flow

-- First, create the missing enums if they don't exist
DO $$ 
BEGIN
    -- Create business_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE business_type AS ENUM (
            'physical_business',
            'service_provider', 
            'venue',
            'online_business',
            'mobile_service'
        );
    END IF;
    
    -- Create service_rate_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_rate_type') THEN
        CREATE TYPE service_rate_type AS ENUM (
            'hourly',
            'per_project',
            'per_session',
            'per_day',
            'fixed'
        );
    END IF;
END $$;

-- Add missing columns to community_businesses table
DO $$ 
BEGIN
    -- Add business_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'business_type'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN business_type business_type NOT NULL DEFAULT 'physical_business';
    END IF;

    -- Add subcategory if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN subcategory varchar(100);
    END IF;

    -- Add social_media JSONB field if missing  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'social_media'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN social_media jsonb DEFAULT '{}';
    END IF;

    -- Add location fields if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN zip_code varchar(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN country varchar(100) DEFAULT 'United States';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN latitude decimal(10, 8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN longitude decimal(11, 8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'service_area_radius'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN service_area_radius integer;
    END IF;

    -- Add business details fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'business_hours'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN business_hours jsonb DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'price_range'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN price_range varchar(20) CHECK (price_range IN ('$', '$$', '$$$', '$$$$'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN tags text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'specialties'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN specialties text[] DEFAULT '{}';
    END IF;

    -- Add media fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN logo_url varchar(500);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN cover_image_url varchar(500);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'gallery_images'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN gallery_images text[] DEFAULT '{}';
    END IF;

    -- Add verification fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'verification_date'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN verification_date timestamptz;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'verified_by'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN verified_by uuid REFERENCES auth.users(id);
    END IF;

    -- Add SEO fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN slug varchar(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'keywords'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN keywords text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'featured'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN featured boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'featured_until'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN featured_until timestamptz;
    END IF;

    -- Add metrics fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'view_count'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN view_count integer NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'contact_count'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN contact_count integer NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'rating_average'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN rating_average decimal(3,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'rating_count'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN rating_count integer NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'last_active_at'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN last_active_at timestamptz DEFAULT now();
    END IF;

    -- Add service-specific fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'hourly_rate'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN hourly_rate numeric;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'service_rate_type'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN service_rate_type service_rate_type;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'service_offerings'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN service_offerings text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'accepts_online_booking'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN accepts_online_booking boolean DEFAULT false;
    END IF;

END $$;

-- Create unique constraint on slug if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'community_businesses' 
        AND constraint_name = 'community_businesses_slug_key'
    ) THEN
        ALTER TABLE community_businesses 
        ADD CONSTRAINT community_businesses_slug_key UNIQUE (slug);
    END IF;
END $$;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_community_businesses_business_type ON community_businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_community_businesses_location ON community_businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_community_businesses_featured ON community_businesses(featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_community_businesses_slug ON community_businesses(slug);
CREATE INDEX IF NOT EXISTS idx_community_businesses_rating ON community_businesses(rating_average DESC);

-- Text search index for business name and description
CREATE INDEX IF NOT EXISTS idx_community_businesses_search ON community_businesses 
USING gin(to_tsvector('english', business_name || ' ' || description));

COMMIT;