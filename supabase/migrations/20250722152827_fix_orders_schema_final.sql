-- Simple fix for orders table to match working CheckoutModal expectations
-- This adds the missing columns that were causing the 400 errors

-- Add missing columns to orders table
DO $$
BEGIN
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'currency' AND table_schema = 'public'
    ) THEN
        ALTER TABLE orders ADD COLUMN currency VARCHAR(3) DEFAULT 'USD' NOT NULL;
    END IF;

    -- Add subtotal column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'subtotal' AND table_schema = 'public'
    ) THEN
        ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2);
    END IF;

    -- Add tax_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'tax_amount' AND table_schema = 'public'
    ) THEN
        ALTER TABLE orders ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    -- Add order_status column if it doesn't exist (separate from payment_status)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_status' AND table_schema = 'public'
    ) THEN
        ALTER TABLE orders ADD COLUMN order_status VARCHAR(20) DEFAULT 'pending';
    END IF;

    -- Add user_id column if it doesn't exist (for linking to authenticated users)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES profiles(id);
    END IF;

    -- Add metadata JSONB column if it doesn't exist (for flexible data storage)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'metadata' AND table_schema = 'public'
    ) THEN
        ALTER TABLE orders ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add missing is_co_organizer column to follower_promotions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'follower_promotions' AND column_name = 'is_co_organizer' AND table_schema = 'public'
    ) THEN
        ALTER TABLE follower_promotions ADD COLUMN is_co_organizer BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON TABLE orders IS 'Orders table with all required columns for working CheckoutModal';