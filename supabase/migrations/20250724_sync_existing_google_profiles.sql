-- Sync existing Google OAuth users' profiles with their Google data
-- This migration ensures all existing Google users have their avatar and name properly synced

-- Create a temporary function to sync all Google OAuth users
CREATE OR REPLACE FUNCTION sync_all_google_oauth_profiles()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    status TEXT
) AS $$
DECLARE
    user_record RECORD;
    sync_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through all auth users who signed in with Google
    FOR user_record IN 
        SELECT 
            au.id,
            au.email,
            au.raw_user_meta_data,
            au.app_metadata,
            p.full_name AS current_name,
            p.avatar_url AS current_avatar
        FROM auth.users au
        LEFT JOIN profiles p ON p.id = au.id
        WHERE au.app_metadata->>'provider' = 'google'
           OR au.raw_user_meta_data->>'iss' LIKE '%google%'
           OR au.raw_user_meta_data->>'avatar_url' IS NOT NULL
           OR au.raw_user_meta_data->>'picture' IS NOT NULL
    LOOP
        BEGIN
            -- Extract Google data
            DECLARE
                google_name TEXT;
                google_avatar TEXT;
                needs_update BOOLEAN := FALSE;
            BEGIN
                google_name := COALESCE(
                    user_record.raw_user_meta_data->>'full_name',
                    user_record.raw_user_meta_data->>'name'
                );
                
                google_avatar := COALESCE(
                    user_record.raw_user_meta_data->>'avatar_url',
                    user_record.raw_user_meta_data->>'picture'
                );
                
                -- Check if update is needed
                IF (google_avatar IS NOT NULL AND google_avatar != COALESCE(user_record.current_avatar, '')) OR
                   (google_name IS NOT NULL AND google_name != COALESCE(user_record.current_name, '')) THEN
                    needs_update := TRUE;
                END IF;
                
                IF needs_update THEN
                    -- Update or insert profile
                    INSERT INTO profiles (
                        id,
                        email,
                        full_name,
                        avatar_url,
                        created_at,
                        updated_at
                    ) VALUES (
                        user_record.id,
                        user_record.email,
                        COALESCE(google_name, user_record.current_name, split_part(user_record.email, '@', 1)),
                        COALESCE(google_avatar, user_record.current_avatar),
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT (id) DO UPDATE
                    SET
                        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
                        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
                        updated_at = NOW();
                    
                    sync_count := sync_count + 1;
                    
                    -- Return result
                    user_id := user_record.id;
                    email := user_record.email;
                    full_name := COALESCE(google_name, user_record.current_name);
                    avatar_url := google_avatar;
                    status := 'synced';
                    RETURN NEXT;
                END IF;
            END;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                user_id := user_record.id;
                email := user_record.email;
                full_name := NULL;
                avatar_url := NULL;
                status := 'error: ' || SQLERRM;
                RETURN NEXT;
        END;
    END LOOP;
    
    -- Log summary
    RAISE NOTICE 'Google OAuth sync complete. Synced: %, Errors: %', sync_count, error_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the sync for all existing Google OAuth users
DO $$
DECLARE
    sync_results RECORD;
BEGIN
    RAISE NOTICE 'Starting Google OAuth profile sync...';
    
    -- Create a temporary table to store results
    CREATE TEMP TABLE google_sync_results AS
    SELECT * FROM sync_all_google_oauth_profiles();
    
    -- Log results
    FOR sync_results IN SELECT * FROM google_sync_results WHERE status = 'synced'
    LOOP
        RAISE NOTICE 'Synced profile for %: % (avatar: %)', 
            sync_results.email, 
            sync_results.full_name,
            CASE WHEN sync_results.avatar_url IS NOT NULL THEN 'yes' ELSE 'no' END;
    END LOOP;
    
    -- Log errors if any
    FOR sync_results IN SELECT * FROM google_sync_results WHERE status LIKE 'error:%'
    LOOP
        RAISE WARNING 'Failed to sync %: %', sync_results.email, sync_results.status;
    END LOOP;
    
    -- Show summary
    RAISE NOTICE 'Sync complete. Total synced: %', 
        (SELECT COUNT(*) FROM google_sync_results WHERE status = 'synced');
END $$;

-- Drop the temporary function as it's no longer needed
DROP FUNCTION IF EXISTS sync_all_google_oauth_profiles();

-- Add an index on avatar_url for better performance when checking avatars
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- Add a comment explaining this migration
COMMENT ON SCHEMA public IS 'Google OAuth profile sync completed on ' || NOW()::TEXT;