# Seating System Deployment Guide

This guide covers the deployment steps needed to activate the interactive seating chart functionality for premium events.

## Prerequisites

- Access to Supabase dashboard
- Database admin privileges
- Understanding of SQL execution in Supabase

## Deployment Steps

### 1. Database Schema Migration

Execute the following SQL files in your Supabase SQL editor in order:

#### Step 1.1: Create Seating Tables
Run the contents of `supabase/seating_migration.sql`:

```sql
-- This file contains:
-- - New enum types (venue_type, hold_status)
-- - Tables: venues, seating_charts, seat_categories, seats, seat_holds
-- - Indexes for performance optimization
-- - Row Level Security (RLS) policies
-- - Database triggers for updated_at timestamps
-- - Convenience views for reporting
```

#### Step 1.2: Create RPC Functions
Run the contents of `supabase/seating_rpc_functions.sql`:

```sql
-- This file contains:
-- - get_available_seats() - Returns available seats for an event
-- - get_best_available_seats() - Smart seat selection algorithm
-- - hold_seats() - Temporary seat reservations during checkout
-- - release_seat_holds() - Release expired or cancelled holds
-- - complete_seat_purchase() - Convert holds to purchased tickets
-- - cleanup_expired_seat_holds() - Maintenance function
-- - Support functions for seat hold management
```

#### Step 1.3: Setup Storage Buckets
Run the contents of `supabase/storage_setup.sql`:

```sql
-- This file contains:
-- - Storage bucket creation for venue images and seating charts
-- - Storage policies for authenticated users
-- - Helper functions for file path generation
-- - Cleanup functions for orphaned files
```

### 2. Update Database Types

The TypeScript types in `src/types/database.ts` have been extended to include:
- Venue, SeatingChart, SeatCategory, Seat, SeatHold types
- New enum types (VenueType, HoldStatus)
- Function signatures for RPC calls
- Convenience views for seat availability

### 3. Environment Verification

Ensure your `.env` file contains the correct Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Storage Bucket Verification

After running the storage setup, verify in your Supabase dashboard:

1. Navigate to Storage in Supabase dashboard
2. Confirm two buckets exist:
   - `venue-images` (for floor plan uploads)
   - `seating-charts` (for chart images)
3. Verify bucket policies allow authenticated users to upload

### 5. Test Database Functions

Test the RPC functions in Supabase SQL editor:

```sql
-- Test available seats (should return empty for non-existent event)
SELECT * FROM get_available_seats('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

-- Test seat hold cleanup
SELECT cleanup_expired_seat_holds();
```

## Feature Overview

### Core Components Updated

1. **SeatingChartWizard** (`src/components/create-event/SeatingChartWizard.tsx`)
   - 4-step wizard: Upload → Configure → Place Seats → Finalize
   - Proper image upload to Supabase Storage
   - Database integration for venues and seating charts

2. **InteractiveSeatingChart** (`src/components/seating/InteractiveSeatingChart.tsx`)
   - Customer-facing seat selection interface
   - Real-time seat availability
   - Touch-friendly mobile support

3. **EventDetail** (`src/pages/EventDetail.tsx`)
   - Displays interactive seating for premium events
   - Integrates with checkout flow

4. **CheckoutModal** (`src/components/CheckoutModal.tsx`)
   - Extended to handle seat purchases
   - Seat hold management during checkout
   - Integration with existing payment processing

### New Services

1. **SeatingService** (`src/lib/services/SeatingService.ts`)
   - Complete CRUD operations for seating data
   - RPC function integration
   - Seat hold management

2. **ImageUploadService** (`src/lib/services/ImageUploadService.ts`)
   - Supabase Storage integration
   - Image optimization
   - Consistent file naming

3. **Data Converter** (`src/lib/utils/seatingDataConverter.ts`)
   - Format alignment between components
   - Data validation utilities
   - Hold data creation helpers

## Verification Steps

### 1. Test Event Creation
1. Create a new premium event
2. Navigate to seating chart setup
3. Upload a floor plan image
4. Configure ticket types and seating sections
5. Place seats on the floor plan
6. Finalize the seating chart

### 2. Test Customer Experience
1. Navigate to the premium event page
2. Verify seating chart displays correctly
3. Select seats and verify hold functionality
4. Complete purchase flow
5. Verify seat status updates

### 3. Test Database Integration
Check that data is properly stored:
```sql
-- Verify venues were created
SELECT * FROM venues ORDER BY created_at DESC LIMIT 5;

-- Verify seating charts
SELECT * FROM seating_charts ORDER BY created_at DESC LIMIT 5;

-- Check seat categories
SELECT * FROM seat_categories ORDER BY created_at DESC LIMIT 10;

-- Monitor seat holds
SELECT * FROM seat_holds WHERE status = 'active';
```

## Monitoring and Maintenance

### 1. Automated Cleanup
Set up a periodic job to clean expired seat holds:
```sql
-- Run this periodically (e.g., every 5 minutes)
SELECT cleanup_expired_seat_holds();
```

### 2. Storage Monitoring
Monitor storage usage in Supabase dashboard:
- Venue images bucket size
- Orphaned file cleanup
- User upload patterns

### 3. Performance Monitoring
Watch for performance issues with:
- Seat availability queries
- Large venue rendering
- Mobile performance on complex charts

## Rollback Plan

If issues occur during deployment:

1. **Database Rollback**: The new tables are separate from existing ones, so they can be dropped without affecting existing functionality:
```sql
-- Emergency rollback (use with caution)
DROP TABLE IF EXISTS seat_holds CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS seat_categories CASCADE;
DROP TABLE IF EXISTS seating_charts CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TYPE IF EXISTS venue_type;
DROP TYPE IF EXISTS hold_status;
```

2. **Storage Rollback**: Delete the storage buckets if needed:
```sql
DELETE FROM storage.objects WHERE bucket_id IN ('venue-images', 'seating-charts');
DELETE FROM storage.buckets WHERE id IN ('venue-images', 'seating-charts');
```

3. **Code Rollback**: The new seating functionality is opt-in for premium events, so existing events will continue to work normally.

## Support and Troubleshooting

### Common Issues

1. **Storage Upload Errors**
   - Verify bucket policies are correct
   - Check file size limits (10MB default)
   - Ensure CORS is configured for your domain

2. **Seat Hold Failures**
   - Check RPC function permissions
   - Verify seat availability before holding
   - Monitor for session ID conflicts

3. **Performance Issues**
   - Consider adding more indexes for large venues
   - Implement seat data caching for popular events
   - Monitor database query performance

### Database Queries for Debugging

```sql
-- Check seat availability for an event
SELECT sc.name, COUNT(s.id) as total_seats, 
       COUNT(CASE WHEN s.is_available THEN 1 END) as available_seats
FROM seating_charts sc
LEFT JOIN seats s ON s.seating_chart_id = sc.id
WHERE sc.event_id = 'your-event-id'
GROUP BY sc.id, sc.name;

-- Monitor active seat holds
SELECT sh.*, s.seat_identifier, e.title as event_title
FROM seat_holds sh
JOIN seats s ON s.id = sh.seat_id
JOIN seating_charts sc ON sc.id = s.seating_chart_id
JOIN events e ON e.id = sc.event_id
WHERE sh.status = 'active'
ORDER BY sh.expires_at;

-- Storage usage summary
SELECT bucket_id, COUNT(*) as file_count, 
       pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects 
WHERE bucket_id IN ('venue-images', 'seating-charts')
GROUP BY bucket_id;
```

## Post-Deployment Checklist

- [ ] All SQL migrations executed successfully
- [ ] Storage buckets created and accessible
- [ ] Test event creation with seating chart
- [ ] Test customer seat selection flow
- [ ] Test complete purchase workflow
- [ ] Verify email notifications work
- [ ] Monitor error logs for issues
- [ ] Set up seat hold cleanup job
- [ ] Document any environment-specific configurations

The seating system is now production-ready and fully integrated with your existing event management platform!