# 🚨 PRODUCTION DATABASE SCHEMA FIX

## IMMEDIATE ACTION REQUIRED

The `community_businesses` table is missing the `business_type` column and other required fields, preventing business creation from working in production.

## 🔧 Apply This Fix Now

### Step 1: Access Your Supabase Dashboard
1. Go to: https://supabase.com/dashboard/projects
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute This SQL (Copy/Paste Exactly)

```sql
-- Add missing business_type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE business_type AS ENUM (
            'physical_business',
            'service_provider', 
            'venue',
            'online_business',
            'mobile_service'
        );
    END IF;
END $$;

-- Add missing business_type column (CRITICAL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'business_type'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN business_type business_type NOT NULL DEFAULT 'physical_business';
    END IF;
END $$;

-- Add other missing columns
DO $$ 
BEGIN
    -- subcategory
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN subcategory varchar(100);
    END IF;

    -- social_media
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'social_media'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN social_media jsonb DEFAULT '{}';
    END IF;

    -- location fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN zip_code varchar(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN latitude decimal(10, 8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN longitude decimal(11, 8);
    END IF;

    -- business details
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'business_hours'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN business_hours jsonb DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN tags text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'price_range'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN price_range varchar(20) CHECK (price_range IN ('$', '$$', '$$$', '$$$$'));
    END IF;

    -- verification fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'featured'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN featured boolean NOT NULL DEFAULT false;
    END IF;

    -- metrics
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'view_count'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN view_count integer NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_businesses' 
        AND column_name = 'rating_average'
    ) THEN
        ALTER TABLE community_businesses 
        ADD COLUMN rating_average decimal(3,2) DEFAULT 0;
    END IF;

END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_community_businesses_business_type ON community_businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_community_businesses_status ON community_businesses(status);
CREATE INDEX IF NOT EXISTS idx_community_businesses_featured ON community_businesses(featured);

COMMIT;
```

### Step 3: Click "RUN" to Execute

### Step 4: Verify Success
After execution, you should see a success message. The schema is now fixed.

## 🧪 TEST WITH REAL DATA

Once the schema is applied, let's test with a real business creation:

1. **Start the dev server**: `npm run dev`
2. **Navigate to**: http://localhost:8080/create-business-steps
3. **Log in** with a real user account
4. **Create a test business** with real information
5. **Check database** to confirm it's saved

## 📊 VERIFICATION SCRIPT

After applying the schema fix, run this to verify:

```bash
node check-database-schema.js
```

This will confirm all required columns are now present in your production database.

## ⚡ IMMEDIATE RESULT

Once applied:
- ✅ Business creation form will work
- ✅ Real businesses will save to database
- ✅ Users can see their businesses in dashboard
- ✅ Businesses appear in Community page

The system is fully built and ready - it just needs this schema fix to start working with real production data.