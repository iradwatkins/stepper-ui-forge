-- Consolidated Migration: Fix Authentication Issues for Non-Admin Users
-- This migration addresses all authentication and database schema issues

-- Step 1: Fix profiles table structure
-- Add missing admin columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;

-- Step 2: Create follower system tables if they don't exist
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, organizer_id)
);

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

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_organizer_id ON user_follows(organizer_id);
CREATE INDEX IF NOT EXISTS idx_follower_promotions_follow_id ON follower_promotions(follow_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_promotion_id ON referral_codes(promotion_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_follower_id ON commission_earnings(follower_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON profiles(admin_level);

-- Step 4: Create required functions
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

-- Step 5: Fix profile creation trigger for Google OAuth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile with proper Google OAuth data handling
    INSERT INTO profiles (
        id,
        email,
        full_name,
        avatar_url,
        is_admin,
        admin_level,
        notification_preferences,
        privacy_settings,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name',
            NEW.email
        ),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
        CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
        '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
        '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Ensure triggers exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also handle updates for OAuth users
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile when user metadata changes (e.g., Google OAuth updates)
    UPDATE profiles SET
        email = NEW.email,
        full_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name',
            profiles.full_name
        ),
        avatar_url = COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            profiles.avatar_url
        ),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Step 7: Enable RLS on new tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing restrictive policies and create proper ones
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can view public events" ON events;

-- Create new, more permissive policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create new, more permissive policies for events
CREATE POLICY "Users can view all public events" ON events
    FOR SELECT USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for follower system
CREATE POLICY "Users can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Users can view promotions" ON follower_promotions
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage promotions" ON follower_promotions
  FOR ALL USING (auth.uid() = organizer_id);

CREATE POLICY "Users can view referral codes" ON referral_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM follower_promotions fp 
      WHERE fp.id = referral_codes.promotion_id 
      AND (fp.follower_id = auth.uid() OR fp.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their referral codes" ON referral_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM follower_promotions fp 
      WHERE fp.id = referral_codes.promotion_id 
      AND fp.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their earnings" ON commission_earnings
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = organizer_id);

-- Step 9: Update existing admin user
UPDATE profiles 
SET is_admin = true, admin_level = 3 
WHERE email = 'iradwatkins@gmail.com';

-- Step 10: Create admin permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_events BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_manage_system BOOLEAN DEFAULT FALSE,
    can_manage_billing BOOLEAN DEFAULT FALSE,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on admin permissions
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create admin permissions policies
CREATE POLICY "Admins can view admin permissions" ON admin_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can manage admin permissions" ON admin_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true 
            AND profiles.admin_level >= 2
        )
    );

-- Create admin permissions functions
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((
        SELECT is_admin 
        FROM profiles 
        WHERE id = user_uuid
    ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_admin_permissions(user_uuid UUID)
RETURNS TABLE (
    is_admin BOOLEAN,
    admin_level INTEGER,
    can_manage_users BOOLEAN,
    can_manage_events BOOLEAN,
    can_view_analytics BOOLEAN,
    can_manage_system BOOLEAN,
    can_manage_billing BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.is_admin, false) as is_admin,
        COALESCE(p.admin_level, 0) as admin_level,
        COALESCE(ap.can_manage_users, false) as can_manage_users,
        COALESCE(ap.can_manage_events, false) as can_manage_events,
        COALESCE(ap.can_view_analytics, false) as can_view_analytics,
        COALESCE(ap.can_manage_system, false) as can_manage_system,
        COALESCE(ap.can_manage_billing, false) as can_manage_billing
    FROM profiles p
    LEFT JOIN admin_permissions ap ON ap.user_id = p.id AND ap.is_active = true
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Ensure admin permissions exist for admin user
INSERT INTO admin_permissions (
    user_id, 
    can_manage_users, 
    can_manage_events, 
    can_view_analytics, 
    can_manage_system, 
    can_manage_billing
)
SELECT 
    id, 
    true, 
    true, 
    true, 
    true, 
    true
FROM profiles 
WHERE email = 'iradwatkins@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    can_manage_users = true,
    can_manage_events = true,
    can_view_analytics = true,
    can_manage_system = true,
    can_manage_billing = true,
    is_active = true,
    updated_at = NOW();

-- Final step: Add helpful comments
COMMENT ON FUNCTION get_follower_count(UUID) IS 'Returns the count of followers for a given organizer';
COMMENT ON FUNCTION is_following(UUID, UUID) IS 'Checks if a user follows an organizer';
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile on user registration with proper Google OAuth handling';
COMMENT ON FUNCTION handle_user_update() IS 'Updates profile when user metadata changes';
COMMENT ON FUNCTION is_user_admin(UUID) IS 'Checks if a user has admin privileges';
COMMENT ON FUNCTION get_admin_permissions(UUID) IS 'Returns detailed admin permissions for a user';