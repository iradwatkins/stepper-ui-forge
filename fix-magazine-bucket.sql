-- Check if magazine-images bucket exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'magazine-images') THEN
    -- Create magazine-images storage bucket
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES (
      'magazine-images',
      'magazine-images',
      true,
      true,
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
    RAISE NOTICE 'Created magazine-images bucket';
  ELSE
    -- Update existing bucket to ensure correct settings
    UPDATE storage.buckets 
    SET 
      public = true,
      avif_autodetection = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    WHERE id = 'magazine-images';
    RAISE NOTICE 'Updated magazine-images bucket settings';
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all magazine images" ON storage.objects;

-- Create storage policies for magazine-images bucket
-- Public read access
CREATE POLICY "Public can view magazine images" ON storage.objects
  FOR SELECT USING (bucket_id = 'magazine-images');

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload magazine images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'magazine-images' 
    AND auth.role() = 'authenticated'
  );

-- Users can update their own uploaded images
CREATE POLICY "Users can update own magazine images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'magazine-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own uploaded images
CREATE POLICY "Users can delete own magazine images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'magazine-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can manage all magazine images
CREATE POLICY "Admins can manage all magazine images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'magazine-images'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- List all storage buckets to verify
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
ORDER BY name;