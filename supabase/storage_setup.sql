-- Storage Setup for Venue Images
-- This creates the necessary storage buckets and policies for venue floor plan images

-- ===============================
-- CREATE STORAGE BUCKETS
-- ===============================

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

-- ===============================
-- STORAGE POLICIES
-- ===============================

-- Venue Images Bucket Policies
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

-- Seating Charts Bucket Policies  
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

-- ===============================
-- HELPER FUNCTIONS
-- ===============================

-- Function to generate venue image path
CREATE OR REPLACE FUNCTION generate_venue_image_path(
    user_id UUID,
    venue_id UUID,
    file_extension TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN user_id::text || '/venues/' || venue_id::text || '/floor-plan' || file_extension;
END;
$$;

-- Function to generate seating chart image path
CREATE OR REPLACE FUNCTION generate_seating_chart_path(
    user_id UUID,
    event_id UUID,
    chart_id UUID,
    file_extension TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN user_id::text || '/events/' || event_id::text || '/charts/' || chart_id::text || file_extension;
END;
$$;

-- Function to clean up orphaned storage files
CREATE OR REPLACE FUNCTION cleanup_orphaned_venue_images()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    file_record RECORD;
BEGIN
    -- Find venue images that don't have corresponding venue records
    FOR file_record IN
        SELECT so.name, so.bucket_id
        FROM storage.objects so
        WHERE so.bucket_id = 'venue-images'
        AND NOT EXISTS (
            SELECT 1 FROM venues v
            WHERE so.name LIKE '%' || v.id::text || '%'
        )
    LOOP
        -- Delete the orphaned file
        DELETE FROM storage.objects 
        WHERE bucket_id = file_record.bucket_id 
        AND name = file_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

-- Function to clean up orphaned seating chart images
CREATE OR REPLACE FUNCTION cleanup_orphaned_seating_chart_images()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    file_record RECORD;
BEGIN
    -- Find seating chart images that don't have corresponding seating chart records
    FOR file_record IN
        SELECT so.name, so.bucket_id
        FROM storage.objects so
        WHERE so.bucket_id = 'seating-charts'
        AND NOT EXISTS (
            SELECT 1 FROM seating_charts sc
            WHERE so.name LIKE '%' || sc.id::text || '%'
        )
    LOOP
        -- Delete the orphaned file
        DELETE FROM storage.objects 
        WHERE bucket_id = file_record.bucket_id 
        AND name = file_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_venue_image_path(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_seating_chart_path(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_venue_images() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_seating_chart_images() TO service_role;

-- Add comments
COMMENT ON FUNCTION generate_venue_image_path(UUID, UUID, TEXT) IS 'Generates a consistent path for venue floor plan images';
COMMENT ON FUNCTION generate_seating_chart_path(UUID, UUID, UUID, TEXT) IS 'Generates a consistent path for seating chart images';
COMMENT ON FUNCTION cleanup_orphaned_venue_images() IS 'Removes venue images that no longer have corresponding database records';
COMMENT ON FUNCTION cleanup_orphaned_seating_chart_images() IS 'Removes seating chart images that no longer have corresponding database records';