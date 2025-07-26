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

-- Add other missing columns
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

    -- social_media
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'social_media'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN social_media jsonb DEFAULT '{}';
    END IF;

    -- location fields
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

    -- business details
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
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN tags text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'price_range'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN price_range varchar(20);
    END IF;

    -- verification fields
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

    -- CRITICAL IMAGE COLUMNS (missing from previous fix)
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
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_community_businesses_business_type ON community_businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_community_businesses_status ON community_businesses(status);
CREATE INDEX IF NOT EXISTS idx_community_businesses_featured ON community_businesses(featured);

COMMIT;