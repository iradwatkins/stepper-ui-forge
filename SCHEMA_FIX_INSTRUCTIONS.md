# 🔧 Community Businesses Database Schema Fix

## Issue Identified
The `community_businesses` table exists but is missing the `business_type` column and several other required fields. This prevents the business creation functionality from working properly.

## Manual Fix Instructions

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar

### Step 2: Apply Schema Fix
1. Open the file: `fix-business-table-schema.sql`
2. Copy the entire contents of the file
3. Paste it into the SQL Editor
4. Click **Run** to execute the SQL

### Step 3: Verify the Fix
Run this command to verify the schema is now correct:
```bash
node check-database-schema.js
```

### Step 4: Test Business Creation
Once the schema is fixed, test the business creation flow:
```bash
node test-business-creation.js
```

## What the Schema Fix Does

The SQL script adds the following missing columns and features:

### Core Business Fields
- `business_type` (enum: physical_business, service_provider, venue, online_business, mobile_service)
- `subcategory` (varchar)
- `social_media` (jsonb)

### Location Fields
- `zip_code`, `country`, `latitude`, `longitude`
- `service_area_radius` (for service providers)

### Business Details
- `business_hours` (jsonb)
- `price_range` ($ to $$$$)
- `tags`, `specialties` (text arrays)

### Media Fields
- `logo_url`, `cover_image_url`, `gallery_images`

### Verification & SEO
- `is_verified`, `verification_date`, `verified_by`
- `slug`, `keywords`, `featured`, `featured_until`

### Metrics
- `view_count`, `contact_count`, `rating_average`, `rating_count`
- `last_active_at`

### Service Provider Fields
- `hourly_rate`, `service_rate_type`
- `service_offerings`, `accepts_online_booking`

### Database Enums
- `business_type` enum
- `service_rate_type` enum

### Indexes
- Performance indexes for filtering and searching
- Full-text search index for business names and descriptions

## Expected Result

After applying the fix:
- ✅ All business creation forms will work properly
- ✅ Users can create businesses through the multi-step wizard
- ✅ Businesses will be saved to the database with all fields
- ✅ Community page will display created businesses
- ✅ Search and filtering will work correctly

## Troubleshooting

If you encounter any issues:

1. **Permission Errors**: Make sure you're using a Supabase user with admin privileges
2. **Constraint Errors**: The script is designed to be safe and won't break existing data
3. **Column Already Exists**: The script checks for existing columns and only adds missing ones

## Alternative: CLI Migration

If you have Supabase CLI set up:
```bash
# This will apply all pending migrations
supabase db push
```

Or if you have migration files:
```bash
supabase migration up
```