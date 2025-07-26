-- Add missing fields to events table
-- These fields are already used in the UI but missing from the database

-- Add end_date for multi-day events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add end_time for multi-day events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add timezone for proper time handling
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';

-- Add tags for event categorization
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);

-- Update existing events to have proper timezone based on their location
-- This is a safe default for US-based events
UPDATE events 
SET timezone = CASE 
    WHEN location ILIKE '%california%' OR location ILIKE '%los angeles%' OR location ILIKE '%san francisco%' THEN 'America/Los_Angeles'
    WHEN location ILIKE '%chicago%' OR location ILIKE '%illinois%' THEN 'America/Chicago'
    WHEN location ILIKE '%denver%' OR location ILIKE '%colorado%' THEN 'America/Denver'
    WHEN location ILIKE '%arizona%' OR location ILIKE '%phoenix%' THEN 'America/Phoenix'
    WHEN location ILIKE '%hawaii%' THEN 'Pacific/Honolulu'
    WHEN location ILIKE '%alaska%' THEN 'America/Anchorage'
    ELSE 'America/New_York'
END
WHERE timezone IS NULL;

-- For existing simple events, set end_date and end_time to match start date/time
-- This ensures consistency for single-day events
UPDATE events 
SET 
    end_date = date,
    end_time = time
WHERE 
    event_type = 'simple' 
    AND end_date IS NULL 
    AND end_time IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN events.end_date IS 'End date for multi-day events';
COMMENT ON COLUMN events.end_time IS 'End time for events (can be on different day than start)';
COMMENT ON COLUMN events.timezone IS 'Timezone for event times (IANA timezone format)';
COMMENT ON COLUMN events.tags IS 'Array of tags for event categorization and search';