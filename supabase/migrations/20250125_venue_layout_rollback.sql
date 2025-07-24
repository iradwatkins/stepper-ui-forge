-- TEMPORARY ROLLBACK MIGRATION
-- Only run this if the production database is having issues with the venue_layout_id column
-- This can be safely run multiple times as it checks for column existence

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_events_venue_layout_id;

-- Drop the columns if they exist
ALTER TABLE events 
DROP COLUMN IF EXISTS venue_layout_id,
DROP COLUMN IF EXISTS seat_overrides;