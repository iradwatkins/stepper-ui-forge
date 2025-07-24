-- Add venue_layout_id to events table to link events with pre-configured venue layouts
ALTER TABLE events 
ADD COLUMN venue_layout_id UUID REFERENCES venue_layouts(id) ON DELETE SET NULL;

-- Add seat_overrides to allow event-specific pricing and availability changes
ALTER TABLE events
ADD COLUMN seat_overrides JSONB;

-- Add index for better query performance
CREATE INDEX idx_events_venue_layout_id ON events(venue_layout_id);

-- Add comment explaining the fields
COMMENT ON COLUMN events.venue_layout_id IS 'Reference to a pre-configured venue layout from venue_layouts table';
COMMENT ON COLUMN events.seat_overrides IS 'Event-specific overrides for seat pricing and availability. Structure: {priceOverrides: {seatId: price}, availabilityOverrides: {seatId: boolean}, categoryPriceMultipliers: {categoryId: multiplier}}';