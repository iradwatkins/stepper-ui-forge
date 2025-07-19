-- Migration: Add support for fixed dollar commissions per seller
-- This allows organizers to set a specific dollar amount per ticket sold instead of percentage

-- Add commission type and fixed amount fields to follower_promotions
ALTER TABLE follower_promotions 
ADD COLUMN commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
ADD COLUMN commission_fixed_amount DECIMAL(10,2) DEFAULT 0.00;

-- Update commission_earnings to store the type used for calculation
ALTER TABLE commission_earnings
ADD COLUMN commission_type VARCHAR(20) DEFAULT 'percentage';

-- Create index for commission type queries
CREATE INDEX idx_follower_promotions_commission_type ON follower_promotions(commission_type);

-- Update existing records to have commission_type = 'percentage'
UPDATE follower_promotions SET commission_type = 'percentage' WHERE commission_type IS NULL;
UPDATE commission_earnings SET commission_type = 'percentage' WHERE commission_type IS NULL;

-- Add comment to clarify commission fields
COMMENT ON COLUMN follower_promotions.commission_rate IS 'Commission rate as decimal (0.05 = 5%) - used when commission_type is percentage';
COMMENT ON COLUMN follower_promotions.commission_fixed_amount IS 'Fixed dollar amount per ticket - used when commission_type is fixed';
COMMENT ON COLUMN follower_promotions.commission_type IS 'Type of commission: percentage or fixed';