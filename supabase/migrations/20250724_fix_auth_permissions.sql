-- Fix authentication issues by removing problematic permission grants
-- The auth schema is managed by Supabase and we cannot grant permissions on it

-- First, ensure all existing users have profiles
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
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate the trigger function without SECURITY DEFINER
-- This prevents permission issues during auth
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

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

    -- Insert into profiles table
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
        RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also handle updates
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;

CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile if it exists
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail
        RAISE LOG 'Failed to update profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- IMPORTANT: Do NOT grant permissions on auth.users
-- The auth schema is managed by Supabase and custom grants will fail

-- Ensure profiles table has proper RLS policies
CREATE POLICY IF NOT EXISTS "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Allow service role to manage profiles
CREATE POLICY IF NOT EXISTS "Service role can manage all profiles" 
    ON profiles FOR ALL 
    USING (auth.role() = 'service_role');