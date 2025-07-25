-- Create magazine-images storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'magazine-images',
  'magazine-images',
  true,
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  avif_autodetection = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
      AND profiles.role = 'admin'
    )
  );