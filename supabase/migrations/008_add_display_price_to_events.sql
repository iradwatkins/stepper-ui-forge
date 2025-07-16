-- Migration: Add Display Price Support for Simple Events
-- This migration adds a display_price field to store reference pricing for Simple Events

-- Note: display_price field already exists in base schema
-- ALTER TABLE events 
-- ADD COLUMN display_price JSONB DEFAULT NULL;

-- Add index for performance on display_price queries
CREATE INDEX idx_events_display_price ON events USING GIN (display_price);

-- Add comment for documentation
COMMENT ON COLUMN events.display_price IS 'Reference price display for Simple Events - contains {amount: number, label: string}';