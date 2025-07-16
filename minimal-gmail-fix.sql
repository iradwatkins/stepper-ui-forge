-- Minimal Gmail Registration Fix
-- This addresses the core issue: missing admin columns in profiles table

-- Step 1: Add missing admin columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;

-- Step 2: Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON profiles(admin_level);

-- Step 3: Fix profile creation trigger for Google OAuth
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

-- Step 4: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Update existing admin user
UPDATE profiles 
SET is_admin = true, admin_level = 3 
WHERE email = 'iradwatkins@gmail.com';

-- Step 6: Add helpful comment
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile on user registration with proper Google OAuth handling';

-- Verification queries (run these after applying the above)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('is_admin', 'admin_level');
-- SELECT email, is_admin, admin_level FROM profiles WHERE email = 'iradwatkins@gmail.com';