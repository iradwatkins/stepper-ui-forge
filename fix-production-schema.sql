-- CRITICAL: Fix Production Schema Issues
-- This script fixes two missing column issues:
-- 1. events.display_price (from migration 008 that was commented out)
-- 2. ticket_types.early_bird_price and early_bird_until (completely missing)

-- PART 1: Fix events.display_price column (migration 008 fix)
-- The original migration had this commented out, causing production breakage
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS display_price JSONB DEFAULT NULL;

-- Add the index that was already created (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_events_display_price 
ON public.events USING GIN (display_price);

-- Add documentation comment
COMMENT ON COLUMN public.events.display_price IS 'Reference price display for Simple Events - contains {amount: number, label: string}';

-- PART 2: Add early bird pricing columns to ticket_types
-- These were defined in TypeScript types but missing from database
ALTER TABLE public.ticket_types 
ADD COLUMN IF NOT EXISTS early_bird_price DECIMAL(10,2);

ALTER TABLE public.ticket_types 
ADD COLUMN IF NOT EXISTS early_bird_until TIMESTAMP WITH TIME ZONE;

-- Add documentation comments for early bird columns
COMMENT ON COLUMN public.ticket_types.early_bird_price IS 'Early bird pricing for tickets (optional)';
COMMENT ON COLUMN public.ticket_types.early_bird_until IS 'Early bird pricing deadline (optional)';

-- Create index for efficient early bird queries
CREATE INDEX IF NOT EXISTS idx_ticket_types_early_bird_until 
ON public.ticket_types(early_bird_until) 
WHERE early_bird_until IS NOT NULL;

-- VERIFICATION QUERIES (run after applying the above)
-- Uncomment these to verify the columns were added successfully:

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'events' AND column_name = 'display_price';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'ticket_types' AND column_name IN ('early_bird_price', 'early_bird_until');