-- Emergency RPC Function Fix
-- Run this immediately to fix the 404 errors

-- 1. Drop any existing function variations
DROP FUNCTION IF EXISTS get_admin_permissions(UUID);
DROP FUNCTION IF EXISTS public.get_admin_permissions(UUID);

-- 2. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permission TEXT DEFAULT 'user';

-- 3. Create the RPC function with explicit schema
CREATE OR REPLACE FUNCTION public.get_admin_permissions(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'is_admin', COALESCE(p.is_admin, false),
    'admin_level', COALESCE(p.admin_level, 0)
  ) INTO result
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Return result or default if no profile found
  IF result IS NULL THEN
    result := json_build_object('is_admin', false, 'admin_level', 0);
  END IF;
  
  RETURN result;
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_admin_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_permissions(UUID) TO anon;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Test the function
SELECT public.get_admin_permissions('00000000-0000-0000-0000-000000000000'::UUID);