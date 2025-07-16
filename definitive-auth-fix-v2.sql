-- StepperAI Definitive Auth Fix v2: Ensures table schema is correct before applying logic.
BEGIN;

-- STEP 1: ALTER TABLE to ensure all required columns exist.
-- This prevents the trigger from failing due to a missing column.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- STEP 2: Drop all potentially conflicting RLS policies to ensure a clean slate.
DROP POLICY IF EXISTS "Allow profile reads" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- STEP 3: Create the correct, permissive RLS policies.
-- Policy 1: Allow authenticated users to read all profiles.
CREATE POLICY "Allow profile reads" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow users to insert their own profile.
CREATE POLICY "Users can insert their own profile." ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to update their own profile.
CREATE POLICY "Users can update their own profile." ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- STEP 4: Recreate the trigger function with 'SECURITY DEFINER'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, avatar_url, email, is_admin, admin_level, notification_preferences, privacy_settings
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    -- Set admin status ONLY for the specified admin email
    CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
    -- Default JSONB values
    '{"emailMarketing": true, "emailUpdates": true, "emailTickets": true, "pushNotifications": true, "smsNotifications": false}',
    '{"profileVisible": true, "showEmail": false, "showPhone": false, "showEvents": true}'
  );
  RETURN NEW;
END;
$$;

-- STEP 5: Re-apply the trigger to the auth.users table.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 6: Manually create/update the admin profile to ensure it is correct.
INSERT INTO public.profiles (id, email, full_name, is_admin, admin_level)
SELECT
    id, email, raw_user_meta_data->>'full_name', true, 3
FROM auth.users
WHERE email = 'iradwatkins@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  is_admin = EXCLUDED.is_admin,
  admin_level = EXCLUDED.admin_level;

COMMIT;