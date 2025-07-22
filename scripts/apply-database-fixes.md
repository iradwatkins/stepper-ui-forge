# Database Schema Fixes for Square Payment Error Resolution

## Issue
The referral_codes 400 errors and Square payment issues are caused by missing database schema columns that the working CheckoutModal expects.

## Solution
Apply the database migration to add the missing columns to your Supabase database.

## Steps to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard: https://app.supabase.com/project/aszzhlgwfbijaotfddsh
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of: `supabase/migrations/20250122_fix_orders_schema_simple.sql`
4. Click **Run** to execute the migration

### Option 2: Using Supabase CLI (If installed)
```bash
# Navigate to project directory
cd /Users/Cursor/stepper-ui-forge

# Apply the migration
supabase db push
```

## What This Migration Does
- ✅ Adds `currency` column to `orders` table (fixes Square payment creation)
- ✅ Adds `subtotal`, `tax_amount`, `order_status` columns to `orders` table
- ✅ Adds `user_id` and `metadata` columns for better order tracking
- ✅ Adds missing `is_co_organizer` column to `follower_promotions` table
- ✅ Reloads PostgREST schema cache

## Expected Result
After applying the migration:
- ✅ No more 400 errors on referral_codes queries
- ✅ CheckoutModal can successfully create orders
- ✅ Square payment integration works properly
- ✅ Database operations complete without schema errors

## Verification
1. Check browser console - no more 400 errors
2. Try creating an order through checkout - should succeed
3. Square payment form should initialize without "applicationId format" errors (once real credentials are added)