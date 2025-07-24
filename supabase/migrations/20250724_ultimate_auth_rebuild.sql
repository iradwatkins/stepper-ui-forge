-- Ultimate Authentication Rebuild Migration
-- This combines all authentication fixes and improvements into one robust solution
-- Fixes the broken authentication that occurred around July 21-23, 2025

-- STEP 1: Ensure all existing auth.users have profiles
-- This handles any users who registered when the trigger was broken
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
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name', 
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'avatar_url',
        au.raw_user_meta_data->>'picture',
        au.raw_user_meta_data->>'photo_url'
    ) as avatar_url,
    CASE WHEN au.email = 'iradwatkins@gmail.com' THEN true ELSE false END as is_admin,
    CASE WHEN au.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END as admin_level,
    COALESCE(
        p.notification_preferences,
        '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}'::jsonb
    ) as notification_preferences,
    COALESCE(
        p.privacy_settings,
        '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'::jsonb
    ) as privacy_settings,
    COALESCE(au.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Update existing profiles that are missing Google OAuth data
UPDATE profiles p
SET 
    avatar_url = COALESCE(
        p.avatar_url,
        au.raw_user_meta_data->>'avatar_url',
        au.raw_user_meta_data->>'picture',
        au.raw_user_meta_data->>'photo_url'
    ),
    full_name = CASE 
        WHEN p.full_name IS NULL OR p.full_name = split_part(p.email, '@', 1) 
        THEN COALESCE(
            au.raw_user_meta_data->>'full_name',
            au.raw_user_meta_data->>'name',
            p.full_name
        )
        ELSE p.full_name
    END,
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id 
    AND (p.avatar_url IS NULL OR p.full_name = split_part(p.email, '@', 1))
    AND (
        au.raw_user_meta_data->>'avatar_url' IS NOT NULL 
        OR au.raw_user_meta_data->>'picture' IS NOT NULL
        OR au.raw_user_meta_data->>'full_name' IS NOT NULL
        OR au.raw_user_meta_data->>'name' IS NOT NULL
    );

-- STEP 3: Drop all existing auth trigger functions to start fresh
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;
DROP FUNCTION IF EXISTS smart_handle_user() CASCADE;
DROP FUNCTION IF EXISTS sync_google_oauth_profile(UUID) CASCADE;

-- STEP 4: Create the ultimate user handling function with all improvements
CREATE OR REPLACE FUNCTION smart_handle_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_avatar_url TEXT;
    retry_count INT := 0;
    max_retries INT := 3;
    success BOOLEAN := FALSE;
BEGIN
    -- Extract full name from multiple possible fields
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'given_name' || ' ' || COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
        NEW.raw_app_metadata->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Trim any extra spaces
    user_full_name := TRIM(user_full_name);
    
    -- Extract avatar URL from multiple possible fields (Google uses different fields)
    user_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'photo_url',
        NEW.raw_app_metadata->>'avatar_url'
    );
    
    -- Retry loop for handling transient failures
    WHILE retry_count < max_retries AND NOT success LOOP
        BEGIN
            -- Attempt to insert or update the profile
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
                user_full_name,
                user_avatar_url,
                CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
                CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
                '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
                '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}',
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE
            SET 
                email = EXCLUDED.email,
                full_name = CASE 
                    WHEN profiles.full_name IS NULL OR profiles.full_name = split_part(profiles.email, '@', 1)
                    THEN EXCLUDED.full_name
                    ELSE profiles.full_name
                END,
                avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
                updated_at = NOW();
            
            success := TRUE;
            
        EXCEPTION
            WHEN OTHERS THEN
                retry_count := retry_count + 1;
                -- Log the error with details
                RAISE LOG 'Profile creation attempt % failed for user % (%): %', 
                    retry_count, NEW.id, NEW.email, SQLERRM;
                    
                -- Wait briefly before retry
                IF retry_count < max_retries THEN
                    PERFORM pg_sleep(0.1 * retry_count);
                END IF;
        END;
    END LOOP;
    
    -- Log final status
    IF success THEN
        RAISE LOG 'Profile successfully created/updated for user % (%)', NEW.id, NEW.email;
    ELSE
        RAISE LOG 'Failed to create profile for user % (%) after % attempts', NEW.id, NEW.email, max_retries;
    END IF;
    
    -- CRITICAL: Always return NEW to not break authentication
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Create update function for handling profile updates
CREATE OR REPLACE FUNCTION smart_handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_avatar_url TEXT;
BEGIN
    -- Only proceed if relevant data changed
    IF OLD.email = NEW.email AND 
       OLD.raw_user_meta_data = NEW.raw_user_meta_data AND
       OLD.raw_app_metadata = NEW.raw_app_metadata THEN
        RETURN NEW;
    END IF;
    
    -- Extract updated data
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'given_name' || ' ' || COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
        NEW.raw_app_metadata->>'full_name'
    );
    
    user_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'photo_url',
        NEW.raw_app_metadata->>'avatar_url'
    );
    
    -- Update profile
    UPDATE profiles
    SET 
        email = NEW.email,
        full_name = CASE 
            WHEN user_full_name IS NOT NULL AND TRIM(user_full_name) != ''
            THEN TRIM(user_full_name)
            ELSE profiles.full_name
        END,
        avatar_url = COALESCE(user_avatar_url, profiles.avatar_url),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    -- If no profile exists (edge case), create one
    IF NOT FOUND THEN
        PERFORM smart_handle_user() FROM (SELECT NEW.*) AS t;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Failed to update profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Create triggers with proper ordering
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION smart_handle_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW 
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION smart_handle_user_update();

-- STEP 7: Create a manual sync function for troubleshooting
CREATE OR REPLACE FUNCTION sync_user_profile(user_id UUID)
RETURNS TABLE(
    status TEXT,
    profile_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT
) AS $$
DECLARE
    user_record RECORD;
    profile_record RECORD;
BEGIN
    -- Get user data
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            NULL::UUID as profile_id,
            'User not found'::TEXT as email,
            NULL::TEXT as full_name,
            NULL::TEXT as avatar_url;
        RETURN;
    END IF;
    
    -- Try to sync profile
    PERFORM smart_handle_user() FROM (SELECT user_record.*) AS t;
    
    -- Get updated profile
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            'success'::TEXT as status,
            profile_record.id as profile_id,
            profile_record.email as email,
            profile_record.full_name as full_name,
            profile_record.avatar_url as avatar_url;
    ELSE
        RETURN QUERY SELECT 
            'failed'::TEXT as status,
            user_id as profile_id,
            user_record.email as email,
            NULL::TEXT as full_name,
            NULL::TEXT as avatar_url;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 8: Ensure proper RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Essential policies
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT 
    USING (privacy_settings->>'profileVisible' = 'true');

CREATE POLICY "Service role full access" 
    ON profiles FOR ALL 
    USING (auth.role() = 'service_role');

-- STEP 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- STEP 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_profile(UUID) TO authenticated;

-- Final verification query to check the migration success
DO $$
DECLARE
    missing_profiles_count INT;
    profiles_without_google_data INT;
BEGIN
    -- Count users without profiles
    SELECT COUNT(*) INTO missing_profiles_count
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    WHERE p.id IS NULL;
    
    -- Count profiles missing Google data
    SELECT COUNT(*) INTO profiles_without_google_data
    FROM profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE p.avatar_url IS NULL 
    AND (au.raw_user_meta_data->>'avatar_url' IS NOT NULL 
         OR au.raw_user_meta_data->>'picture' IS NOT NULL);
    
    RAISE NOTICE 'Migration complete. Missing profiles: %, Profiles needing Google data: %', 
        missing_profiles_count, profiles_without_google_data;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION smart_handle_user() IS 'Robust user profile creation with retry logic and comprehensive Google OAuth support';
COMMENT ON FUNCTION smart_handle_user_update() IS 'Handles profile updates when auth user data changes';
COMMENT ON FUNCTION sync_user_profile(UUID) IS 'Manually sync a user profile - useful for troubleshooting';