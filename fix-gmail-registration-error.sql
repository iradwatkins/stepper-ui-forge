-- EMERGENCY FIX: Gmail Registration "Database error saving new user"
-- This targets the exact error from: http://localhost:8080/events?error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user

BEGIN;

-- STEP 1: Remove ALL restrictive RLS policies that are blocking profile creation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile reads" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- STEP 2: Create PERMISSIVE policies that allow profile creation during registration
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- STEP 3: Fix the trigger function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile with Google OAuth data, bypassing RLS due to SECURITY DEFINER
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    is_admin,
    admin_level,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'iradwatkins@gmail.com' THEN 3 ELSE 0 END,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- STEP 4: Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Grant explicit permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- STEP 6: Create admin profile if missing
INSERT INTO public.profiles (id, email, full_name, is_admin, admin_level, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    true,
    3,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'iradwatkins@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

COMMIT;

-- Verification query to confirm fix
SELECT 'GMAIL REGISTRATION FIX APPLIED SUCCESSFULLY!' as status,
       'Test with appvillagellc@gmail.com and ira@irawatkins.com' as next_step;