-- Dashboard Production Fixes Migration
-- This migration adds missing tables and data for production-ready dashboards

-- 1. Create venue_layouts table for VenueManagement
CREATE TABLE IF NOT EXISTS venue_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout_data JSONB NOT NULL, -- Stores the venue configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_venue_layouts_user_id ON venue_layouts(user_id);

-- 2. Create seller_payouts table for payout tracking
CREATE TABLE IF NOT EXISTS seller_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method TEXT, -- 'bank_transfer', 'paypal', 'check', etc.
  payout_details JSONB, -- Store account details securely
  reference_number TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_payouts_user_id ON seller_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(status);

-- 3. Create commission_transactions for detailed tracking
CREATE TABLE IF NOT EXISTS commission_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES ticket_types(id),
  quantity INTEGER NOT NULL,
  ticket_price INTEGER NOT NULL, -- Original ticket price in cents
  commission_rate DECIMAL(5,2) NOT NULL, -- Commission percentage
  commission_amount INTEGER NOT NULL, -- Commission earned in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  referral_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_transactions_user_id ON commission_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_order_id ON commission_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_status ON commission_transactions(status);

-- 4. Create audience_insights table for analytics
CREATE TABLE IF NOT EXISTS audience_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Attendee
  age_group TEXT CHECK (age_group IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  gender TEXT,
  location TEXT,
  referral_source TEXT, -- How they heard about the event
  purchase_behavior JSONB, -- Purchase patterns, preferences
  engagement_score INTEGER, -- 0-100 engagement rating
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audience_insights_event_id ON audience_insights(event_id);
CREATE INDEX IF NOT EXISTS idx_audience_insights_age_group ON audience_insights(age_group);

-- 5. Create live_analytics_sessions for real-time tracking
CREATE TABLE IF NOT EXISTS live_analytics_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_type TEXT DEFAULT 'check_in', -- 'check_in', 'sales', 'engagement'
  metrics JSONB NOT NULL, -- Real-time metrics data
  active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_live_analytics_sessions_event_id ON live_analytics_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_live_analytics_sessions_active ON live_analytics_sessions(active);

-- 6. Enable RLS on all new tables
ALTER TABLE venue_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_analytics_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies

-- Venue layouts policies
CREATE POLICY "Users can manage own venue layouts" ON venue_layouts
  FOR ALL USING (auth.uid() = user_id);

-- Seller payouts policies
CREATE POLICY "Users can view own payouts" ON seller_payouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payouts" ON seller_payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Commission transactions policies
CREATE POLICY "Users can view own commissions" ON commission_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create commission records" ON commission_transactions
  FOR INSERT WITH CHECK (true); -- Allows system to create records

-- Audience insights policies
CREATE POLICY "Event owners can view insights" ON audience_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = audience_insights.event_id 
      AND events.owner_id = auth.uid()
    )
  );

-- Live analytics policies
CREATE POLICY "Event owners can manage analytics sessions" ON live_analytics_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = live_analytics_sessions.event_id 
      AND events.owner_id = auth.uid()
    )
  );

-- 8. Create functions for commission calculations

CREATE OR REPLACE FUNCTION calculate_commission_for_sale(
  p_order_id UUID,
  p_referral_code TEXT
) RETURNS VOID AS $$
DECLARE
  v_commission_rate DECIMAL(5,2);
  v_seller_id UUID;
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- Get seller and commission rate from referral code
  SELECT follower_id, commission_rate INTO v_seller_id, v_commission_rate
  FROM referral_codes
  WHERE code = p_referral_code
  AND is_active = true;

  IF v_seller_id IS NULL THEN
    RETURN;
  END IF;

  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  -- Process each order item
  FOR v_item IN 
    SELECT oi.*, tt.event_id 
    FROM order_items oi
    JOIN ticket_types tt ON oi.ticket_type_id = tt.id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Create commission transaction
    INSERT INTO commission_transactions (
      user_id,
      order_id,
      event_id,
      ticket_type_id,
      quantity,
      ticket_price,
      commission_rate,
      commission_amount,
      status,
      referral_code
    ) VALUES (
      v_seller_id,
      p_order_id,
      v_item.event_id,
      v_item.ticket_type_id,
      v_item.quantity,
      v_item.unit_price,
      v_commission_rate,
      ROUND(v_item.unit_price * v_item.quantity * v_commission_rate / 100),
      'confirmed',
      p_referral_code
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create view for sales dashboard
CREATE OR REPLACE VIEW seller_sales_summary AS
SELECT 
  ct.user_id,
  COUNT(DISTINCT ct.order_id) as total_sales,
  SUM(ct.quantity) as total_tickets,
  SUM(ct.commission_amount) as total_earnings,
  AVG(ct.commission_rate) as avg_commission_rate,
  DATE_TRUNC('month', ct.created_at) as month
FROM commission_transactions ct
WHERE ct.status = 'confirmed'
GROUP BY ct.user_id, DATE_TRUNC('month', ct.created_at);

-- Grant access to authenticated users
GRANT SELECT ON seller_sales_summary TO authenticated;

-- 10. Update order processing to calculate commissions
-- This would be called after successful order creation
COMMENT ON FUNCTION calculate_commission_for_sale IS 
'Call this function after order creation if a referral code was used:
SELECT calculate_commission_for_sale(order_id, referral_code);';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';