# URGENT: Fix Production Database Schema Errors

Your production database is missing critical columns causing 400 errors. Follow these steps immediately:

## Option 1: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new
2. Copy the entire contents of: `supabase/migrations/20250723_fix_production_schema_urgent.sql`
3. Paste it into the SQL editor
4. Click "Run" to execute

## Option 2: Using Supabase CLI (if you have the password)
```bash
# You'll need your database password
supabase db push --db-url "postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
```

## Option 3: Direct SQL Connection
```bash
# Using psql with your production credentials
psql "postgresql://postgres.aszzhlgwfbijaotfddsh:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres" -f supabase/migrations/20250723_fix_production_schema_urgent.sql
```

## What This Migration Fixes:
1. **follower_promotions** missing columns:
   - `is_co_organizer`
   - `can_work_events`
   - `can_sell_events`
   - `is_approved`
   - `commission_type`
   - `commission_fixed_amount`

2. **team_members** missing columns:
   - `status`
   - `disabled_at`
   - `disabled_by`
   - `disable_reason`

3. Updates the `get_user_permissions` RPC function

## Verification:
After running the migration, refresh your production site. The 400 errors should be gone.

## If Errors Persist:
Check if there are any other missing columns by running:
```sql
-- Check follower_promotions columns
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'follower_promotions';

-- Check team_members columns
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'team_members';
```