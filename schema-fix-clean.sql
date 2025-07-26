-- Fix community_businesses table schema
-- Safe to run - checks for existing columns before adding

-- Add missing business_type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE business_type AS ENUM (
            'physical_business',
            'service_provider', 
            'venue',
            'online_business',
            'mobile_service'
        );
    END IF;
END $$;

-- Add missing business_type column (CRITICAL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'business_type'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN business_type business_type NOT NULL DEFAULT 'physical_business';
    END IF;
END $$;

-- Add other essential missing columns
DO $$ 
BEGIN
    -- subcategory
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN subcategory varchar(100);
    END IF;

    -- social_media (JSON for Facebook, Instagram, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'social_media'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN social_media jsonb DEFAULT '{}';
    END IF;

    -- zip_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN zip_code varchar(20);
    END IF;

    -- latitude/longitude for location services
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

    -- business_hours (JSON for weekly schedule)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'business_hours'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN business_hours jsonb DEFAULT '{}';
    END IF;

    -- tags (array for categories/keywords)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN tags text[] DEFAULT '{}';
    END IF;

    -- price_range (without CHECK constraint to avoid conflicts)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'price_range'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN price_range varchar(20);
    END IF;

    -- verification status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
    END IF;

    -- featured business flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'featured'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN featured boolean NOT NULL DEFAULT false;
    END IF;

    -- metrics
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
        AND column_name = 'rating_average'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN rating_average decimal(3,2) DEFAULT 0;
    END IF;

    -- country field with default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN country varchar(100) DEFAULT 'United States';
    END IF;

    -- service area radius for service providers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'service_area_radius'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN service_area_radius integer;
    END IF;

END $$;

-- Create performance indexes (safe - will only create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_community_businesses_business_type ON community_businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_community_businesses_status ON community_businesses(status);
CREATE INDEX IF NOT EXISTS idx_community_businesses_featured ON community_businesses(featured);
CREATE INDEX IF NOT EXISTS idx_community_businesses_category ON community_businesses(category);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Community businesses schema fix completed successfully!';
END $$;