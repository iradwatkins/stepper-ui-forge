# Database Migration Instructions

## Issues Fixed ✅

### Classes Page
The Classes page glitching/blinking issue has been resolved by:
1. Fixed infinite re-render loop in useClasses hook
2. Fixed useEffect dependency in Classes.tsx
3. Improved error handling for missing database tables

### Community Page
The Community page issues have been resolved by:
1. Added graceful error handling in CommunityBusinessService
2. Fixed admin setup errors by checking column existence
3. Suppressed console spam from missing admin columns

## Missing Database Tables & Columns
The following migrations need to be run in your Supabase instance:

### 1. Stepping Classes Tables
- **Migration file**: `/supabase/migrations/015_create_stepping_classes.sql`
- **Tables created**:
  - `stepping_classes` - Main class information
  - `class_images` - Class photos
  - `class_attendees` - Student registrations
  - `vod_classes` - Video on demand classes
  - `vod_sections` - VOD course sections
  - `vod_videos` - Individual video lessons

### 2. Admin Permissions System
- **Migration file**: `/supabase/migrations/007_add_admin_permissions.sql`
- **Changes**:
  - Adds `is_admin` column to `profiles` table
  - Adds `admin_level` column to `profiles` table
  - Creates `admin_permissions` table for granular permissions

### 3. Community Business Tables
- **Migration files**: 
  - `/supabase/migrations/20250113000001_community_businesses.sql`
  - `/supabase/migrations/20250113000002_business_functions.sql`
- **Tables created**:
  - `community_businesses` - Business listings
  - `business_reviews` - Customer reviews
  - `business_inquiries` - Contact form submissions

## How to Run Migrations

### Option A: Using Supabase CLI (Recommended)
```bash
# 1. Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# 2. Link to your project
supabase link --project-ref aszzhlgwfbijaotfddsh

# 3. Run migrations
supabase db push
```

### Option B: Manual SQL Execution
1. Go to Supabase Dashboard: https://app.supabase.com/project/aszzhlgwfbijaotfddsh
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Execute in order:
   - `007_add_admin_permissions.sql` (if profiles table exists)
   - `015_create_stepping_classes.sql`
   - `20250113000001_community_businesses.sql`
   - `20250113000002_business_functions.sql`

### Option C: Using Database Connection
```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.aszzhlgwfbijaotfddsh.supabase.co:5432/postgres"

# Run migration files
\i supabase/migrations/007_add_admin_permissions.sql
\i supabase/migrations/015_create_stepping_classes.sql
\i supabase/migrations/20250113000001_community_businesses.sql
\i supabase/migrations/20250113000002_business_functions.sql
```

## Current Status
- **Classes page**: Shows mock data gracefully when table missing, no more glitching
- **Community page**: Shows empty state when table missing, no console errors
- **Admin setup**: Silently skips when columns missing, no console spam
- **Error handling**: Both services handle missing tables gracefully

## Benefits After Migration
- Full Classes feature functionality
- Community business listings
- User reviews and ratings
- Business inquiry forms
- VOD content support

## Testing After Migration
1. Visit `/classes` - Should show empty state (no mock data)
2. Visit `/community` - Should show empty state
3. Create test content:
   - `/create-class` - Create a stepping class
   - `/create-business` - Create a business listing
4. Verify data appears on respective pages

## Note
The app now handles missing tables gracefully without crashing or glitching. However, running the migrations will enable full feature functionality.