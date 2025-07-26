# Apply Event Extended Fields Migration

This migration adds support for multi-day events, timezone handling, and event tags.

## Migration Details

**File**: `supabase/migrations/021_add_event_extended_fields.sql`

**New Fields Added**:
- `end_date` (DATE) - For multi-day events
- `end_time` (TIME) - End time for events
- `timezone` (VARCHAR) - Timezone support (defaults to 'UTC')
- `tags` (TEXT[]) - Event tagging system

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
npx supabase db push
```

### Option 2: Direct SQL Application
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/021_add_event_extended_fields.sql`
4. Execute the migration

### Option 3: Using psql
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/021_add_event_extended_fields.sql
```

## Post-Migration Steps

1. **Verify the migration**:
   ```sql
   -- Check if new columns exist
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'events'
   AND column_name IN ('end_date', 'end_time', 'timezone', 'tags');
   ```

2. **Update existing events** (optional):
   ```sql
   -- Set timezone for existing events to your local timezone
   UPDATE events 
   SET timezone = 'America/Chicago' 
   WHERE timezone = 'UTC';
   ```

## Features Enabled

After applying this migration, your events will support:

1. **Multi-day Events**: 
   - Conferences, festivals, workshops spanning multiple days
   - Proper end date/time tracking

2. **Timezone Support**:
   - Events display correctly across time zones
   - International event scheduling

3. **Event Tags**:
   - Better categorization and search
   - Tag-based filtering and discovery

## Rollback (if needed)

```sql
-- Remove the new columns
ALTER TABLE events DROP COLUMN IF EXISTS end_date;
ALTER TABLE events DROP COLUMN IF EXISTS end_time;
ALTER TABLE events DROP COLUMN IF EXISTS timezone;
ALTER TABLE events DROP COLUMN IF EXISTS tags;

-- Drop constraints
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_end_date_after_start;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_end_time_with_end_date;

-- Drop indexes
DROP INDEX IF EXISTS idx_events_end_date;
DROP INDEX IF EXISTS idx_events_timezone;
DROP INDEX IF EXISTS idx_events_tags;
```