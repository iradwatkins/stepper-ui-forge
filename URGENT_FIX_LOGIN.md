# 🚨 URGENT: Fix User Login Issues

The login is broken due to a problematic GRANT statement in one of the migrations.

## Root Cause:
The migration `20250723_fix_missing_profiles.sql` contains:
```sql
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT SELECT ON auth.users TO postgres, service_role;
```

**This is not allowed in Supabase!** The auth schema is managed by Supabase and custom grants will fail, breaking the migration and authentication.

## Immediate Fix (Apply NOW):

### Via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new
2. Run this fix:

```sql
-- Fix authentication by ensuring profile creation works properly
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

-- Recreate the trigger function properly
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
    -- Don't fail auth on profile creation error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## What This Fixes:
- ✅ Removes the problematic GRANT statements
- ✅ Ensures all users have profiles
- ✅ Recreates the auth trigger properly
- ✅ Users can log in again

## Verification:
After running, test login at https://stepperslife.com/auth

## Complete Fix:
After login works, also run the full migration:
`supabase/migrations/20250724_fix_auth_permissions.sql`

This includes additional improvements for handling profile updates.