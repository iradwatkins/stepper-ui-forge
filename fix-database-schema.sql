-- Fix Database Schema Issues
-- Run this in your Supabase SQL Editor to fix the missing columns

-- 1. Fix follower_promotions table - add missing commission columns
DO $$
BEGIN
    -- Check if commission_rate column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follower_promotions' 
        AND column_name = 'commission_rate'
    ) THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_rate DECIMAL(5,4) DEFAULT 0.0000;
        
        RAISE NOTICE 'Added commission_rate column to follower_promotions';
    ELSE
        RAISE NOTICE 'commission_rate column already exists in follower_promotions';
    END IF;

    -- Check if commission_type column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follower_promotions' 
        AND column_name = 'commission_type'
    ) THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_type VARCHAR(20) DEFAULT 'percentage' 
        CHECK (commission_type IN ('percentage', 'fixed'));
        
        RAISE NOTICE 'Added commission_type column to follower_promotions';
    ELSE
        RAISE NOTICE 'commission_type column already exists in follower_promotions';
    END IF;

    -- Check if commission_fixed_amount column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follower_promotions' 
        AND column_name = 'commission_fixed_amount'
    ) THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN commission_fixed_amount DECIMAL(10,2) DEFAULT 0.00;
        
        RAISE NOTICE 'Added commission_fixed_amount column to follower_promotions';
    ELSE
        RAISE NOTICE 'commission_fixed_amount column already exists in follower_promotions';
    END IF;
END $$;

-- 2. Ensure event_likes table exists and has proper functions
CREATE TABLE IF NOT EXISTS event_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure users can only like an event once
  UNIQUE(user_id, event_id)
);

-- 3. Create/recreate the missing RPC functions
CREATE OR REPLACE FUNCTION get_event_like_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM event_likes
    WHERE event_id = event_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_event_liked(user_uuid UUID, event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM event_likes
    WHERE user_id = user_uuid AND event_id = event_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant proper permissions
GRANT SELECT, INSERT, DELETE ON event_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_like_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_event_liked(UUID, UUID) TO authenticated;

-- 5. Verify the changes
SELECT 'SUCCESS: Database schema fixes applied!' as status;

-- Show follower_promotions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'follower_promotions'
ORDER BY ordinal_position;