-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;

-- User follows table for tracking follower relationships  
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, organizer_id)
);

-- Follower promotions table for tracking additional permissions granted by organizers
CREATE TABLE IF NOT EXISTS follower_promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follow_id UUID REFERENCES user_follows(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  can_sell_tickets BOOLEAN DEFAULT FALSE,
  can_work_events BOOLEAN DEFAULT FALSE,
  is_co_organizer BOOLEAN DEFAULT FALSE,
  commission_rate DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follow_id)
);

-- Referral codes table for tracking unique codes/URLs for promoted followers
CREATE TABLE IF NOT EXISTS referral_codes (
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
CREATE TABLE IF NOT EXISTS commission_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  order_total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for follower system
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_organizer_id ON user_follows(organizer_id);
CREATE INDEX IF NOT EXISTS idx_follower_promotions_follow_id ON follower_promotions(follow_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_promotion_id ON referral_codes(promotion_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_follower_id ON commission_earnings(follower_id);

-- Function to get follower count
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

-- Enable RLS on new tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_follows
CREATE POLICY "Users can view their own follows" ON user_follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = organizer_id);

CREATE POLICY "Users can manage their own follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- RLS policies for follower_promotions
CREATE POLICY "Users can view their own promotions" ON follower_promotions
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = organizer_id);

CREATE POLICY "Organizers can manage promotions" ON follower_promotions
  FOR ALL USING (auth.uid() = organizer_id);

-- RLS policies for referral_codes
CREATE POLICY "Users can view their own referral codes" ON referral_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM follower_promotions fp 
      WHERE fp.id = referral_codes.promotion_id 
      AND (fp.follower_id = auth.uid() OR fp.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own referral codes" ON referral_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM follower_promotions fp 
      WHERE fp.id = referral_codes.promotion_id 
      AND fp.organizer_id = auth.uid()
    )
  );

-- RLS policies for commission_earnings
CREATE POLICY "Users can view their own earnings" ON commission_earnings
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = organizer_id);