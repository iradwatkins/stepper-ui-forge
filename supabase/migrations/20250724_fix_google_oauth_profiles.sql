-- Fix Google OAuth profile creation to include avatar_url and better metadata handling
-- This migration restores avatar extraction and improves Google OAuth user experience

-- First, update existing profiles with missing Google OAuth data
UPDATE profiles p
SET 
    avatar_url = COALESCE(
        p.avatar_url,
        au.raw_user_meta_data->>'avatar_url',
        au.raw_user_meta_data->>'picture'
    ),
    full_name = COALESCE(
        p.full_name,
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(p.email, '@', 1)
    ),
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id 
    AND p.avatar_url IS NULL 
    AND (
        au.raw_user_meta_data->>'avatar_url' IS NOT NULL 
        OR au.raw_user_meta_data->>'picture' IS NOT NULL
    );

-- Drop existing functions and triggers to recreate with improved logic
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;

-- Create improved profile creation function with Google OAuth support
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_name TEXT;
    google_avatar TEXT;
BEGIN
    -- Extract name from metadata or email
    default_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract avatar URL (Google uses both 'avatar_url' and 'picture' fields)
    google_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    -- Insert into profiles table with all Google OAuth data
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
        default_name,
        google_avatar,
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
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create improved profile update function
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    google_avatar TEXT;
    google_name TEXT;
BEGIN
    -- Extract updated Google OAuth data
    google_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );
    
    google_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
    );

    -- Update profile if it exists
    UPDATE profiles
    SET 
        email = NEW.email,
        full_name = COALESCE(google_name, profiles.full_name),
        avatar_url = COALESCE(google_avatar, profiles.avatar_url),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    -- If no profile exists, create one (handles edge cases)
    IF NOT FOUND THEN
        INSERT INTO profiles (
            id,
            email,
            full_name,
            avatar_url,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(google_name, split_part(NEW.email, '@', 1)),
            google_avatar,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail
        RAISE LOG 'Failed to update profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Create a function to sync Google OAuth data on demand (for manual fixes)
CREATE OR REPLACE FUNCTION sync_google_oauth_profile(user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_data RECORD;
BEGIN
    -- Get user data from auth.users
    SELECT * INTO user_data FROM auth.users WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;
    
    -- Update profile with Google OAuth data
    UPDATE profiles
    SET 
        avatar_url = COALESCE(
            profiles.avatar_url,
            user_data.raw_user_meta_data->>'avatar_url',
            user_data.raw_user_meta_data->>'picture'
        ),
        full_name = COALESCE(
            profiles.full_name,
            user_data.raw_user_meta_data->>'full_name',
            user_data.raw_user_meta_data->>'name',
            split_part(profiles.email, '@', 1)
        ),
        updated_at = NOW()
    WHERE id = user_id;
    
    RAISE NOTICE 'Profile synced for user %', user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the sync function to authenticated users
GRANT EXECUTE ON FUNCTION sync_google_oauth_profile(UUID) TO authenticated;

-- Add comment explaining the fix
COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile on signup with Google OAuth avatar and name support';
COMMENT ON FUNCTION handle_user_update() IS 'Updates user profile when auth data changes, syncing Google OAuth data';
COMMENT ON FUNCTION sync_google_oauth_profile(UUID) IS 'Manually sync Google OAuth data to user profile';