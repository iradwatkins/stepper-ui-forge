# Apply Migration to Fix Authentication Issues

## The Problem
Non-admin users can't login because the database schema is missing critical components:
- Missing `is_admin` and `admin_level` columns in profiles table
- Missing `user_follows` table and `get_follower_count` function (causing 404 errors)
- Overly restrictive RLS policies blocking non-admin access

## Solution: Apply Migration Script

The comprehensive migration script `018_consolidated_auth_fix.sql` fixes all these issues.

## How to Apply (Choose One Method)

### Method 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh)
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of `supabase/migrations/018_consolidated_auth_fix.sql`
5. Click "Run" to execute the migration

### Method 2: Using psql (if you have database password)
```bash
# If you have the database password
psql -h aws-0-us-east-2.pooler.supabase.com -U postgres.aszzhlgwfbijaotfddsh -d postgres -f supabase/migrations/018_consolidated_auth_fix.sql
```

### Method 3: Via Supabase CLI (if authentication works)
```bash
# First try to reset database connection
supabase db reset --linked

# Then apply the migration
supabase db push
```

## What This Migration Does

1. **Fixes Profiles Table**: Adds missing `is_admin` and `admin_level` columns
2. **Creates Follower System**: Adds `user_follows` table and related functions
3. **Fixes RLS Policies**: Removes overly restrictive policies, allows public access to profiles/events
4. **Fixes Profile Creation**: Updates trigger to handle Google OAuth properly
5. **Creates Required Functions**: Adds `get_follower_count` and `is_following` functions
6. **Sets Admin Permissions**: Ensures admin user has proper permissions

## Testing After Migration

1. Try logging in with a non-admin Google account
2. Check that no 404 errors appear in browser console
3. Verify that both admin and non-admin users can access the platform

## Rollback (If Needed)
If something goes wrong, you can rollback by running:
```sql
-- This will reset the database to a clean state
-- WARNING: This will remove all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

## Status Check
After applying the migration, check these endpoints to ensure they work:
- `GET /rest/v1/user_follows` - Should return 200, not 404
- `POST /rest/v1/rpc/get_follower_count` - Should return 200, not 404
- Google OAuth login for non-admin users - Should work without errors