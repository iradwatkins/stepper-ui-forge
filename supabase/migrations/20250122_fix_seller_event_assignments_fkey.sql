-- Fix seller_event_assignments foreign key relationship issue
-- This migration adds the missing foreign key constraint for the seller_event_assignments table

-- Drop the existing foreign key constraint if it exists (it might be using wrong name)
ALTER TABLE seller_event_assignments 
DROP CONSTRAINT IF EXISTS seller_event_assignments_event_id_fkey;

-- Re-add the foreign key constraint with proper naming convention
ALTER TABLE seller_event_assignments
ADD CONSTRAINT seller_event_assignments_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Add comment to help Supabase PostgREST find the relationship
COMMENT ON CONSTRAINT seller_event_assignments_event_id_fkey ON seller_event_assignments 
IS '@foreignKey (event_id) references events(id)|@fieldName event';

-- Ensure the column can_sell_tickets exists in follower_promotions (it should already exist)
-- This is just a safety check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'follower_promotions' 
        AND column_name = 'can_sell_tickets'
    ) THEN
        ALTER TABLE follower_promotions 
        ADD COLUMN can_sell_tickets BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Force PostgREST to reload the schema cache by updating a system table
-- This helps resolve the "Could not find a relationship" error
NOTIFY pgrst, 'reload schema';