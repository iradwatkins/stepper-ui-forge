# URGENT: Fix Liked Events Display Error

Users can't see their liked events due to database query errors.

## Errors:
1. `column events_1.display_price does not exist` 
2. `Could not find a relationship between 'follower_promotions' and 'organizer_id'`

## Quick Fix (Apply to Production NOW):

### 1. First, apply the schema fixes if not done already:
```sql
-- Add missing columns to follower_promotions
ALTER TABLE follower_promotions 
ADD COLUMN IF NOT EXISTS can_work_events BOOLEAN DEFAULT false;

ALTER TABLE follower_promotions 
ADD COLUMN IF NOT EXISTS is_co_organizer BOOLEAN DEFAULT false;

ALTER TABLE follower_promotions 
ADD COLUMN IF NOT EXISTS can_sell_events BOOLEAN DEFAULT false;

ALTER TABLE follower_promotions 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add missing columns to team_members
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
```

### 2. Fix the RPC functions (main issue):
Go to: https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new

Copy and run the entire contents of:
`supabase/migrations/20250723_fix_liked_events_rpc.sql`

This migration:
- Fixes column name mismatches (owner_id vs organizer_id, date vs event_date)
- Removes references to non-existent display_price column
- Properly extracts image URLs from JSONB
- Uses correct status check (status = 'published' vs is_published)

## What This Fixes:
- ✅ Liked events will display properly
- ✅ Event images will show correctly
- ✅ Organizer names will appear
- ✅ Price ranges will be calculated from ticket_types

## Verification:
After running the migration:
1. Go to https://stepperslife.com/dashboard/liked
2. You should see all your liked events
3. Both upcoming and past events should load

## If Still Getting Errors:
Check that the specific user has a profile:
```sql
-- Check if user exists in profiles
SELECT * FROM profiles WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094';

-- If not, create it
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT id, email, 
       COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
       created_at, NOW()
FROM auth.users
WHERE id = '1c1e6d27-d386-4278-ad34-8e82c8560094'
ON CONFLICT (id) DO NOTHING;
```