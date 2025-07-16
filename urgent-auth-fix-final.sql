-- StepperAI Urgent Auth Fix: Corrects Profile Creation & RLS Policies
-- This script is idempotent and safe to run multiple times.

BEGIN;

-- STEP 1: Relax Row Level Security (RLS) on the 'profiles' table.
-- This is the most common cause of the "Database error saving new user" issue.
-- We will allow broader access and then secure it properly.

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow profile reads" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;


-- Create new, correct policies
-- 1. Allow all authenticated users to read profiles (adjust if you need stricter privacy).
CREATE POLICY "Allow profile reads" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow users to create their own profile.
CREATE POLICY "Users can insert their own profile." ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Allow users to update their own profile.
CREATE POLICY "Users can update their own profile." ON public.profiles
FOR UPDATE USING (auth.uid() = id);


-- STEP 2: Recreate the function to handle new user profiles.
-- The SECURITY DEFINER clause is CRITICAL. It allows the function to bypass RLS
-- to create the profile, executing with the permissions of the function owner.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    email,
    is_admin,
    admin_level,
    notification_preferences,
    privacy_settings
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    -- Set admin status ONLY for the specified admin email
    CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
    -- Default JSON values
    '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
    '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'
  );
  RETURN NEW;
END;
$$;

-- STEP 3: Recreate the trigger on the 'auth.users' table.
-- This ensures the function above is called every time a new user signs up.

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- STEP 4: Manually create the admin profile if it doesn't exist.
-- This ensures the primary admin account works correctly.

INSERT INTO public.profiles (id, email, full_name, is_admin, admin_level)
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name' AS full_name,
    true AS is_admin,
    3 AS admin_level
FROM auth.users
WHERE email = 'iradwatkins@gmail.com'
ON CONFLICT (id) DO NOTHING; -- This prevents errors if the profile already exists.


COMMIT;