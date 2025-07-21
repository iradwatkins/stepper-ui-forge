-- Fix missing columns in events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create ticket_logs table if missing
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

-- Fix orders table structure
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_id TEXT,
  payment_status TEXT,
  payment_gateway TEXT,
  payment_method TEXT,
  customer_email TEXT,
  items JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  ticket_type_id UUID REFERENCES ticket_types(id),
  ticket_id UUID REFERENCES tickets(id),
  product_name TEXT,
  price INTEGER,
  quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can do anything" ON ticket_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update order status
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_status TEXT,
  p_payment_id TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL
)
RETURNS orders AS $$
DECLARE
  v_order orders;
BEGIN
  UPDATE orders
  SET 
    status = p_status,
    payment_id = COALESCE(p_payment_id, payment_id),
    payment_status = COALESCE(p_payment_status, payment_status),
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  
  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;