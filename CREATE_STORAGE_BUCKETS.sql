-- ====================================================================
-- SUPABASE STORAGE BUCKET SETUP
-- ====================================================================
-- Run this SQL in your Supabase SQL Editor to create the missing storage buckets
-- This will fix the "Bucket not found" error when uploading venue images

-- Create bucket for venue images (floor plans, photos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'venue-images',
    'venue-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for seating chart images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'seating-charts',
    'seating-charts', 
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for venue images
CREATE POLICY "Users can view venue images" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'venue-images');

CREATE POLICY "Authenticated users can upload venue images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'venue-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own venue images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'venue-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own venue images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'venue-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create storage policies for seating charts
CREATE POLICY "Users can view seating chart images" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'seating-charts');

CREATE POLICY "Authenticated users can upload seating chart images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'seating-charts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own seating chart images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'seating-charts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own seating chart images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'seating-charts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Run these queries to verify the buckets were created successfully

-- Check if buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('venue-images', 'seating-charts');

-- Check storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%venue%' OR policyname LIKE '%seating%';