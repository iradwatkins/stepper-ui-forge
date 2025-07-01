-- Migration: Add Follower System with Promotions and Referral Tracking
-- This migration creates the follower relationship system and promotion capabilities

-- User follows table for tracking follower relationships
CREATE TABLE user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, organizer_id)
);

-- Follower promotions table for tracking additional permissions granted by organizers
CREATE TABLE follower_promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follow_id UUID REFERENCES user_follows(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  can_sell_tickets BOOLEAN DEFAULT FALSE,
  can_work_events BOOLEAN DEFAULT FALSE,
  is_co_organizer BOOLEAN DEFAULT FALSE,
  commission_rate DECIMAL(5,4) DEFAULT 0.0000, -- e.g., 0.0500 = 5%
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follow_id)
);

-- Referral codes table for tracking unique codes/URLs for promoted followers
CREATE TABLE referral_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promotion_id UUID REFERENCES follower_promotions(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  qr_code_url TEXT,
  referral_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission tracking for follower earnings
CREATE TABLE commission_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, paid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add referral tracking to orders table
ALTER TABLE orders 
ADD COLUMN referred_by_code VARCHAR(20) REFERENCES referral_codes(code),
ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00;

-- Organizer banking information for payouts (encrypted storage)
CREATE TABLE organizer_banking_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  payout_method VARCHAR(20) NOT NULL, -- 'zelle', 'cashapp', 'paypal'
  payout_details_encrypted TEXT NOT NULL, -- encrypted JSON with banking details
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payout requests tracking what organizers are owed
CREATE TABLE payout_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  platform_fees DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  commission_deductions DECIMAL(10,2) DEFAULT 0.00,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_organizer_id ON user_follows(organizer_id);
CREATE INDEX idx_follower_promotions_organizer_id ON follower_promotions(organizer_id);
CREATE INDEX idx_follower_promotions_follower_id ON follower_promotions(follower_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_event_id ON referral_codes(event_id);
CREATE INDEX idx_commission_earnings_follower_id ON commission_earnings(follower_id);
CREATE INDEX idx_commission_earnings_organizer_id ON commission_earnings(organizer_id);
CREATE INDEX idx_commission_earnings_order_id ON commission_earnings(order_id);
CREATE INDEX idx_orders_referred_by_code ON orders(referred_by_code);
CREATE INDEX idx_payout_requests_organizer_id ON payout_requests(organizer_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);

-- Enable RLS on new tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_banking_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows
CREATE POLICY "Users can view their own follows" ON user_follows
  FOR SELECT USING (follower_id = auth.uid() OR organizer_id = auth.uid());

CREATE POLICY "Users can create follows" ON user_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete their own follows" ON user_follows
  FOR DELETE USING (follower_id = auth.uid());

-- RLS Policies for follower_promotions
CREATE POLICY "Organizers can manage promotions" ON follower_promotions
  FOR ALL USING (organizer_id = auth.uid());

CREATE POLICY "Followers can view their promotions" ON follower_promotions
  FOR SELECT USING (follower_id = auth.uid());

-- RLS Policies for referral_codes
CREATE POLICY "Promotion owners can manage referral codes" ON referral_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM follower_promotions 
      WHERE follower_promotions.id = referral_codes.promotion_id 
      AND (follower_promotions.organizer_id = auth.uid() OR follower_promotions.follower_id = auth.uid())
    )
  );

-- RLS Policies for commission_earnings
CREATE POLICY "Commission stakeholders can view earnings" ON commission_earnings
  FOR SELECT USING (follower_id = auth.uid() OR organizer_id = auth.uid());

CREATE POLICY "System can create commission earnings" ON commission_earnings
  FOR INSERT WITH CHECK (true); -- Handled by application logic

-- RLS Policies for organizer_banking_info
CREATE POLICY "Organizers can manage own banking info" ON organizer_banking_info
  FOR ALL USING (organizer_id = auth.uid());

-- RLS Policies for payout_requests
CREATE POLICY "Organizers can view own payout requests" ON payout_requests
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can create payout requests" ON payout_requests
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

-- Add updated_at triggers
CREATE TRIGGER handle_user_follows_updated_at
  BEFORE UPDATE ON user_follows
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_follower_promotions_updated_at
  BEFORE UPDATE ON follower_promotions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_commission_earnings_updated_at
  BEFORE UPDATE ON commission_earnings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_organizer_banking_info_updated_at
  BEFORE UPDATE ON organizer_banking_info
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Database functions for common operations

-- Function to get follower count for an organizer
CREATE OR REPLACE FUNCTION get_follower_count(organizer_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_follows
    WHERE organizer_id = organizer_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user follows organizer
CREATE OR REPLACE FUNCTION is_following(follower_uuid UUID, organizer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_follows
    WHERE follower_id = follower_uuid AND organizer_id = organizer_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions for an organizer
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID, organizer_uuid UUID)
RETURNS TABLE (
  can_sell_tickets BOOLEAN,
  can_work_events BOOLEAN,
  is_co_organizer BOOLEAN,
  commission_rate DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(fp.can_sell_tickets, false),
    COALESCE(fp.can_work_events, false),
    COALESCE(fp.is_co_organizer, false),
    COALESCE(fp.commission_rate, 0.0000)
  FROM user_follows uf
  LEFT JOIN follower_promotions fp ON fp.follow_id = uf.id
  WHERE uf.follower_id = user_uuid AND uf.organizer_id = organizer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars TEXT = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- Exclude O and 0 for clarity
  result VARCHAR(20);
  i INTEGER;
BEGIN
  result := '';
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;