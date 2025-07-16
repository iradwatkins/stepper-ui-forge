-- CRITICAL AUTH FIX: Apply this SQL to fix non-admin user login issues
-- Copy and paste this entire script into Supabase SQL Editor

-- 1. Add missing admin columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;

-- 2. Create user_follows table (fixes 404 errors)
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, organizer_id)
);

-- 3. Create get_follower_count function (fixes 404 errors)
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

-- 4. Create is_following function
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

-- 5. Fix profile creation trigger for Google OAuth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        is_admin = CASE WHEN EXCLUDED.email = 'iradwatkins@gmail.com' THEN true ELSE profiles.is_admin END,
        admin_level = CASE WHEN EXCLUDED.email = 'iradwatkins@gmail.com' THEN 3 ELSE profiles.admin_level END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Enable RLS on user_follows table
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policy for user_follows
DROP POLICY IF EXISTS "Users can view follows" ON user_follows;
CREATE POLICY "Users can view follows" ON user_follows
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;
CREATE POLICY "Users can manage their follows" ON user_follows
    FOR ALL USING (auth.uid() = follower_id);

-- 9. Fix existing admin user
UPDATE profiles 
SET is_admin = true, admin_level = 3 
WHERE email = 'iradwatkins@gmail.com';

-- 10. Grant necessary permissions for profile access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Success message
SELECT 'Migration completed successfully!' as status;