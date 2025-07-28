-- Check if follower_promotions table exists and has the correct foreign key
-- This might be causing the 400 error

-- First, check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'follower_promotions'
);

-- If it doesn't exist, the referral_codes query needs to be updated
-- to not use the !promotion_id foreign key syntax

-- Alternative query without the foreign key join:
-- Instead of:
-- select=promotion_id,event_id,is_active,follower_promotions!promotion_id(follower_id,organizer_id)
-- Use:
-- select=promotion_id,event_id,is_active