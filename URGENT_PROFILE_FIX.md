# URGENT: Fix Missing User Profiles Error

Users are getting errors when trying to like events because their profiles don't exist in the database.

## Error:
```
insert or update on table "event_likes" violates foreign key constraint "event_likes_user_id_fkey"
Key (user_id)=(1c1e6d27-d386-4278-ad34-8e82c8560094) is not present in table "profiles"
```

## Quick Fix (Apply to Production NOW):

### Via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new
2. Copy this entire SQL block:

```sql
-- Create profiles for all auth users that don't have one
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

-- Fix the specific user from the error
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094') 
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094') THEN
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        SELECT id, email, 
               COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
               created_at, NOW()
        FROM auth.users
        WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094';
    END IF;
END $$;
```

3. Click "Run"

## What This Fixes:
- Creates missing profiles for all authenticated users
- Specifically fixes user `1c1e6d27-d386-4278-ad34-8e82c8560094`
- Prevents foreign key constraint errors when liking events

## Long-term Fix:
After the immediate fix, also run:
`supabase/migrations/20250723_fix_missing_profiles.sql`

This improves the auth trigger to prevent this from happening again.

## Verification:
After running, users should be able to:
- ✅ Like events
- ✅ Share events
- ✅ Follow organizers
- ✅ All other authenticated actions