-- RUN THIS AFTER THE SCHEMA FIX TO FIX RLS POLICIES
-- Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new

-- 1. Drop all existing policies on orders table to start fresh
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders by email" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;

-- 2. Drop all existing policies on order_items table
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON order_items;
DROP POLICY IF EXISTS "Order items can be created with order" ON order_items;

-- 3. Create simple, permissive policies that will work
-- Allow any authenticated user to create orders
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view orders by their email
CREATE POLICY "Users can view their orders" ON orders
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    (
      customer_email = auth.jwt()->>'email' OR
      user_id = auth.uid()
    )
  );

-- Allow users to update their own orders
CREATE POLICY "Users can update their orders" ON orders
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND 
    (
      customer_email = auth.jwt()->>'email' OR
      user_id = auth.uid()
    )
  );

-- Allow authenticated users to create order items
CREATE POLICY "Anyone can create order items" ON order_items
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view order items for their orders
CREATE POLICY "Users can view their order items" ON order_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.customer_email = auth.jwt()->>'email' OR
        orders.user_id = auth.uid()
      )
    )
  );

-- 4. Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Test the policies are working
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'orders';
  
  RAISE NOTICE 'Number of policies on orders table: %', policy_count;
END $$;

-- 6. Show current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;