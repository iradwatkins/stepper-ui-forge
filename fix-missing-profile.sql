-- Fix for missing profile when user is authenticated
-- This script creates a profile for the user that exists in auth.users but not in profiles table

-- Check if the user exists in auth.users but not in profiles
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find users in auth.users that don't have a profile
    FOR user_record IN
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        -- Create profile for missing user
        INSERT INTO public.profiles (
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
            user_record.id,
            user_record.email,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name', 
                user_record.raw_user_meta_data->>'name',
                split_part(user_record.email, '@', 1) -- Use email username as fallback
            ),
            user_record.raw_user_meta_data->>'avatar_url',
            CASE WHEN user_record.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
            CASE WHEN user_record.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
            '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}'::jsonb,
            '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'::jsonb,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created profile for user: % (%)', user_record.email, user_record.id;
    END LOOP;
END $$;

-- Specific fix for the reported user
-- Only run if the user exists in auth.users but not in profiles
INSERT INTO public.profiles (
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
    ),
    au.raw_user_meta_data->>'avatar_url',
    CASE WHEN au.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
    CASE WHEN au.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
    '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}'::jsonb,
    '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'::jsonb,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.id = '1c1e6d27-d386-4278-ad34-8e82c8560094'::uuid
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Verify the trigger is properly set up
-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also ensure the function exists and is correct
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
            split_part(NEW.email, '@', 1) -- Fallback to email username
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check current status
SELECT 
    'Total auth.users' as metric, 
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
    'Total profiles' as metric, 
    COUNT(*) as count 
FROM public.profiles
UNION ALL
SELECT 
    'Users without profiles' as metric, 
    COUNT(*) as count 
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- List users without profiles
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;