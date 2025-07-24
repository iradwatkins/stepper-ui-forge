-- Script to check and add missing venue-related columns to production database
-- Run this script to ensure all required columns exist

-- 1. Check if venue_name column exists, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'venue_name'
    ) THEN
        -- Add venue_name column
        ALTER TABLE events ADD COLUMN venue_name VARCHAR(255);
        
        -- Update existing events to use organization_name as venue_name
        UPDATE events 
        SET venue_name = COALESCE(organization_name, 'Venue') 
        WHERE venue_name IS NULL;
        
        -- Make venue_name required
        ALTER TABLE events ALTER COLUMN venue_name SET NOT NULL;
        
        -- Add index
        CREATE INDEX idx_events_venue_name ON events(venue_name);
        
        RAISE NOTICE 'Added venue_name column to events table';
    ELSE
        RAISE NOTICE 'venue_name column already exists';
    END IF;
END $$;

-- 2. Check if venue_layout_id column exists, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'venue_layout_id'
    ) THEN
        -- Add venue_layout_id column
        ALTER TABLE events 
        ADD COLUMN venue_layout_id UUID REFERENCES venue_layouts(id) ON DELETE SET NULL;
        
        -- Add index
        CREATE INDEX idx_events_venue_layout_id ON events(venue_layout_id);
        
        -- Add comment
        COMMENT ON COLUMN events.venue_layout_id IS 'Reference to a pre-configured venue layout from venue_layouts table';
        
        RAISE NOTICE 'Added venue_layout_id column to events table';
    ELSE
        RAISE NOTICE 'venue_layout_id column already exists';
    END IF;
END $$;

-- 3. Check if seat_overrides column exists, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'seat_overrides'
    ) THEN
        -- Add seat_overrides column
        ALTER TABLE events ADD COLUMN seat_overrides JSONB;
        
        -- Add comment
        COMMENT ON COLUMN events.seat_overrides IS 'Event-specific overrides for seat pricing and availability. Structure: {priceOverrides: {seatId: price}, availabilityOverrides: {seatId: boolean}, categoryPriceMultipliers: {categoryId: multiplier}}';
        
        RAISE NOTICE 'Added seat_overrides column to events table';
    ELSE
        RAISE NOTICE 'seat_overrides column already exists';
    END IF;
END $$;

-- 4. Verify all columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('venue_name', 'venue_layout_id', 'seat_overrides')
ORDER BY column_name;

-- 5. Check if venue_layouts table exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'venue_layouts'
) as venue_layouts_table_exists;