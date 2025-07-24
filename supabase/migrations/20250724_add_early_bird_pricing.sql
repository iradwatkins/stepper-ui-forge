-- Add early bird pricing columns to ticket_types table
-- These columns were defined in TypeScript types but missing from database

BEGIN;

-- Add early_bird_price column (nullable, decimal for price)
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS early_bird_price DECIMAL(10,2);

-- Add early_bird_until column (nullable, timestamp for deadline)
ALTER TABLE public.ticket_types  
ADD COLUMN IF NOT EXISTS early_bird_until TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.ticket_types.early_bird_price IS 'Early bird pricing for tickets (optional)';
COMMENT ON COLUMN public.ticket_types.early_bird_until IS 'Early bird pricing deadline (optional)';

-- Create index for efficient early bird queries
CREATE INDEX IF NOT EXISTS idx_ticket_types_early_bird_until 
ON public.ticket_types(early_bird_until) 
WHERE early_bird_until IS NOT NULL;

COMMIT;