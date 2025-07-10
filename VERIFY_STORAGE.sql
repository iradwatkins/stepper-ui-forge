-- ====================================================================
-- VERIFY STORAGE SETUP
-- ====================================================================
-- Run this to check if storage buckets and policies are properly configured

-- Check if buckets exist
SELECT 
    id as bucket_id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id IN ('venue-images', 'seating-charts');

-- Check storage policies
SELECT 
    policyname as policy_name,
    cmd as operation,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%venue%' OR policyname LIKE '%seating%')
ORDER BY policyname;

-- Test bucket access (should return empty if buckets exist)
SELECT 
    name,
    bucket_id,
    created_at
FROM storage.objects 
WHERE bucket_id IN ('venue-images', 'seating-charts')
LIMIT 5;