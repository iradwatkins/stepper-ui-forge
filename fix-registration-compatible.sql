-- CRITICAL REGISTRATION FIX: PostgreSQL Compatible Version
-- This script fixes user registration issues with compatibility for older PostgreSQL versions
-- 
-- PROBLEMS FIXED:
-- 1. Missing admin columns in profiles table (is_admin, admin_level)
-- 2. Missing/broken profile creation trigger
-- 3. Profile creation trigger referencing non-existent columns
-- 4. Conflicting trigger functions from multiple migrations
-- 5. RLS policies that may block profile creation

BEGIN;

-- STEP 1: Add missing admin columns to profiles table if they don't exist
DO $$
BEGIN
    -- Add is_admin column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_admin column to profiles table';
    ELSE
        RAISE NOTICE 'is_admin column already exists';
    END IF;
    
    -- Add admin_level column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'admin_level') THEN
        ALTER TABLE profiles ADD COLUMN admin_level INTEGER DEFAULT 0;
        RAISE NOTICE 'Added admin_level column to profiles table';
    ELSE
        RAISE NOTICE 'admin_level column already exists';
    END IF;
END $$;

-- STEP 2: Create indexes for admin columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON profiles(admin_level);

-- STEP 3: Create unified profile creation trigger function
-- This replaces any existing conflicting functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile with proper Google OAuth data handling and admin setup
    -- SECURITY DEFINER allows this function to bypass RLS
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
        is_admin = EXCLUDED.is_admin,
        admin_level = EXCLUDED.admin_level,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create user update trigger function for OAuth profile updates
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user update
        RAISE WARNING 'Profile update failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Recreate triggers to ensure they're properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- STEP 6: Ensure RLS is properly configured for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remove any overly restrictive policies that might block profile creation
DROP POLICY IF EXISTS "Restrict profile creation" ON profiles;
DROP POLICY IF EXISTS "Block anonymous access" ON profiles;

-- STEP 7: Drop existing policies before recreating (for compatibility)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create permissive policies that allow profile creation during registration
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- STEP 8: Set up the designated admin user if they don't already have admin privileges
UPDATE profiles 
SET is_admin = true, admin_level = 3, updated_at = NOW() 
WHERE email = 'iradwatkins@gmail.com' AND (is_admin IS FALSE OR admin_level < 3);

-- STEP 9: Add helpful comments for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile on user registration with proper OAuth handling and admin setup';
COMMENT ON FUNCTION handle_user_update() IS 'Updates profile when user metadata changes (OAuth updates)';
COMMENT ON COLUMN profiles.is_admin IS 'Boolean flag indicating if user has any admin privileges';
COMMENT ON COLUMN profiles.admin_level IS 'Admin level: 0=regular, 1=moderator, 2=admin, 3=super_admin';

COMMIT;

-- VERIFICATION: Run these queries to verify the fix worked
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name IN ('is_admin', 'admin_level');

-- SELECT email, is_admin, admin_level, created_at 
-- FROM profiles 
-- WHERE email = 'iradwatkins@gmail.com';

-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- VERIFICATION MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Registration system fix completed successfully!';
    RAISE NOTICE '📝 New users can now register via email/password or Google OAuth';
    RAISE NOTICE '🔒 Admin user setup completed for iradwatkins@gmail.com';
    RAISE NOTICE '🧪 Test registration at: /auth/register or /auth/login';
END $$;