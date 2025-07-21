-- COMPLETE FIX FOR PAYMENT SYSTEM
-- Run this entire script in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new

-- PART 1: Fix table structure
-- ============================

-- Add missing columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id),
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Rename columns if needed
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

-- Add missing columns to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS unit_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id);

-- Fix events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- PART 2: Fix RLS Policies
-- ========================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders by email" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON order_items;
DROP POLICY IF EXISTS "Order items can be created with order" ON order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can update their orders" ON orders;
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;

-- Create new, working policies
-- Allow authenticated users to create orders
CREATE POLICY "Auth users can create orders" ON orders
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own orders
CREATE POLICY "Users view own orders" ON orders
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    (
      user_id = auth.uid() OR
      customer_email = auth.jwt()->>'email'
    )
  );

-- Allow users to update their own orders
CREATE POLICY "Users update own orders" ON orders
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND 
    (
      user_id = auth.uid() OR
      customer_email = auth.jwt()->>'email'
    )
  );

-- Allow authenticated users to create order items
CREATE POLICY "Auth users can create order items" ON order_items
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their order items
CREATE POLICY "Users view own order items" ON order_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.user_id = auth.uid() OR
        orders.customer_email = auth.jwt()->>'email'
      )
    )
  );

-- PART 3: Grant permissions
-- =========================
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- PART 4: Refresh schema cache
-- ============================
NOTIFY pgrst, 'reload schema';

-- PART 4.5: Ensure tickets table has proper foreign keys
-- ========================================================
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id),
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- PART 5: Verify everything worked
-- =================================
SELECT 
  'Orders table columns:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

SELECT 
  'Active RLS policies:' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;