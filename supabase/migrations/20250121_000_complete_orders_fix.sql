-- Complete fix for orders table schema issues
-- This ensures all required columns exist

-- First, add missing columns to existing orders table if it exists
DO $$
BEGIN
  -- Add order_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'order_status') THEN
    ALTER TABLE orders ADD COLUMN order_status TEXT DEFAULT 'pending' 
      CHECK (order_status IN ('pending', 'processing', 'awaiting_cash_payment', 'cash_confirmed', 'completed', 'cancelled', 'refunded'));
  END IF;

  -- Add event_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'event_id') THEN
    ALTER TABLE orders ADD COLUMN event_id UUID REFERENCES events(id);
  END IF;

  -- Add customer_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
    ALTER TABLE orders ADD COLUMN customer_name TEXT;
  END IF;

  -- Add customer_phone if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
    ALTER TABLE orders ADD COLUMN customer_phone TEXT;
  END IF;

  -- Add total_amount if missing (or rename total to total_amount)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'total') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
    ALTER TABLE orders RENAME COLUMN total TO total_amount;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
    ALTER TABLE orders ADD COLUMN total_amount INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add payment_intent_id if missing (or rename payment_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'payment_id') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_intent_id') THEN
    ALTER TABLE orders RENAME COLUMN payment_id TO payment_intent_id;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_intent_id') THEN
    ALTER TABLE orders ADD COLUMN payment_intent_id TEXT;
  END IF;

  -- Rename status to payment_status if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'status') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE orders RENAME COLUMN status TO payment_status;
  END IF;

  -- Rename payment_gateway to payment_method if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'payment_gateway') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders RENAME COLUMN payment_gateway TO payment_method;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT;
  END IF;
END $$;

-- Ensure order_items table has correct columns
DO $$
BEGIN
  -- Add unit_price if missing (or rename price)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'order_items' AND column_name = 'price') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'order_items' AND column_name = 'unit_price') THEN
    ALTER TABLE order_items RENAME COLUMN price TO unit_price;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'order_items' AND column_name = 'unit_price') THEN
    ALTER TABLE order_items ADD COLUMN unit_price INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add total_price if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
    ALTER TABLE order_items ADD COLUMN total_price INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add ticket_type_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'order_items' AND column_name = 'ticket_type_id') THEN
    ALTER TABLE order_items ADD COLUMN ticket_type_id UUID REFERENCES ticket_types(id);
  END IF;

  -- Add quantity if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'order_items' AND column_name = 'quantity') THEN
    ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Fix events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create ticket_logs if missing
CREATE TABLE IF NOT EXISTS ticket_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT,
  message TEXT,
  context JSONB,
  duration_ms INTEGER,
  error_code TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders by email" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON orders;
DROP POLICY IF EXISTS "Order items can be created with order" ON order_items;
DROP POLICY IF EXISTS "Service role can manage ticket logs" ON ticket_logs;

-- Create new RLS policies
CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own orders by email" ON orders
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    customer_email = auth.jwt()->>'email'
  );

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    customer_email = auth.jwt()->>'email'
  );

CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Order items can be created with order" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id
    )
  );

CREATE POLICY "Service role can manage ticket logs" ON ticket_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON ticket_logs TO service_role;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the final structure
SELECT 
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_name = 'orders'
ORDER BY c.ordinal_position;