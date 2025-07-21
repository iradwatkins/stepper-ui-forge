-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ALL SCHEMA ISSUES
-- Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new

-- 1. Add missing columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Rename columns if needed
DO $$
BEGIN
  -- Rename total to total_amount if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'total') THEN
    ALTER TABLE orders RENAME COLUMN total TO total_amount;
  END IF;
  
  -- Rename payment_id to payment_intent_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'payment_id') THEN
    ALTER TABLE orders RENAME COLUMN payment_id TO payment_intent_id;
  END IF;
END $$;

-- 3. Add missing columns to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS unit_price INTEGER DEFAULT 0;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS total_price INTEGER DEFAULT 0;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id);

-- 4. Fix events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- 5. Refresh schema cache - IMPORTANT!
NOTIFY pgrst, 'reload schema';

-- 6. Verify the fix worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'order_status';