-- Migration: Add venue_name field to events table
-- This adds venue name as a separate field from the address/location

-- Add venue_name column to events table
ALTER TABLE events ADD COLUMN venue_name VARCHAR(255);

-- Update existing events to use organization_name as venue_name if null
-- This provides a reasonable default for existing events
UPDATE events 
SET venue_name = organization_name 
WHERE venue_name IS NULL;

-- Make venue_name required for new events
ALTER TABLE events ALTER COLUMN venue_name SET NOT NULL;

-- Add index for venue name searches
CREATE INDEX idx_events_venue_name ON events(venue_name);