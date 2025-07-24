-- Fix missing user profiles causing foreign key constraint errors
-- This fixes the error: "Key (user_id)=(xxx) is not present in table profiles"

-- First, create profiles for all auth users that don't have one
INSERT INTO profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as full_name,
    au.created_at,
    au.created_at as updated_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Ensure the auth trigger exists and works properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_name TEXT;
BEGIN
    -- Extract name from metadata or email
    default_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert into profiles table, ignore if already exists
    INSERT INTO profiles (
        id,
        email,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        default_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also handle updates to ensure profiles stay in sync
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile if email changes
    UPDATE profiles
    SET 
        email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    -- If no profile exists, create one
    IF NOT FOUND THEN
        INSERT INTO profiles (
            id,
            email,
            full_name,
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
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Verify specific user has a profile
DO $$
BEGIN
    -- Check if the specific user from the error exists
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094'
    ) AND NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094'
    ) THEN
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        SELECT 
            id,
            email,
            COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
            created_at,
            NOW()
        FROM auth.users
        WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094';
        
        RAISE NOTICE 'Created missing profile for user 1c1e6d27-d386-4278-ad34-8e82c8560094';
    END IF;
END $$;

-- Note: GRANT statements on auth schema are not allowed in Supabase
-- The auth schema is managed by Supabase and custom grants will fail the migration
-- Removed problematic GRANT statements that were breaking authentication