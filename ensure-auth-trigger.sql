-- Ensure auth trigger for profile creation is working properly
-- This script recreates the trigger with proper error handling

-- First, drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Profile already exists, just update it
        UPDATE public.profiles SET
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
    ELSE
        -- Create new profile
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
            NEW.id,
            NEW.email,
            COALESCE(
                NEW.raw_user_meta_data->>'full_name', 
                NEW.raw_user_meta_data->>'name',
                split_part(NEW.email, '@', 1) -- Use email prefix as fallback
            ),
            NEW.raw_user_meta_data->>'avatar_url',
            CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
            CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
            '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}'::jsonb,
            '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'::jsonb,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile was created concurrently, update it instead
        UPDATE public.profiles SET
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
    WHEN OTHERS THEN
        -- Log error details but don't fail authentication
        RAISE WARNING 'Failed to create/update profile for user %: % (SQLSTATE: %)', 
            NEW.id, SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also create/update trigger for user updates (for OAuth profile updates)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS handle_user_update();

CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Only process if user metadata has changed
    IF OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR 
       OLD.email IS DISTINCT FROM NEW.email THEN
       
        -- Check if profile exists
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
        
        IF profile_exists THEN
            -- Update existing profile
            UPDATE public.profiles SET
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
        ELSE
            -- Create profile if it doesn't exist (shouldn't happen, but safety net)
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
                NEW.id,
                NEW.email,
                COALESCE(
                    NEW.raw_user_meta_data->>'full_name', 
                    NEW.raw_user_meta_data->>'name',
                    split_part(NEW.email, '@', 1)
                ),
                NEW.raw_user_meta_data->>'avatar_url',
                CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
                CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
                '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}'::jsonb,
                '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'::jsonb,
                NOW(),
                NOW()
            ) ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
                avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the update
        RAISE WARNING 'Failed to update profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, authenticated;
GRANT SELECT ON auth.users TO postgres, authenticated;

-- Test the triggers are properly installed
SELECT 
    n.nspname as schema,
    c.relname as table,
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'auth' 
AND c.relname = 'users'
AND t.tgname IN ('on_auth_user_created', 'on_auth_user_updated')
ORDER BY t.tgname;