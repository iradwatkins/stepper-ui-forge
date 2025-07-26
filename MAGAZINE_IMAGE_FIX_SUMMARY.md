# Magazine Article Images Fix Summary

## Issues Identified

1. **Storage Bucket Issue**: The `ImageUploadService` was trying to upload magazine images to the `venue-images` bucket instead of the `magazine-images` bucket.

2. **Bucket Configuration**: The `magazine-images` bucket may not exist or may not have proper permissions configured.

3. **Content Block Saving**: Content blocks with images need proper formatting when saved to the database.

## Fixes Applied

### 1. ImageUploadService Update
Updated the `uploadMagazineImage` method to use the correct bucket:
```typescript
// Changed from:
bucket: 'venue-images',

// To:
bucket: 'magazine-images',
```

### 2. Content Block Debugging
Added console logging to track image URL changes and content block saving:
- Added logging in `DraggableContentBlock` when image URLs change
- Added logging in `magazineService.createArticle` to track content blocks being saved

### 3. Database Scripts Created
Created SQL scripts to:
- `fix-magazine-bucket.sql` - Ensures the magazine-images bucket exists with proper permissions
- `debug-magazine-content.sql` - Helps debug content block storage issues

## To Complete the Fix

1. **Run the bucket fix script in Supabase:**
   ```sql
   -- Run the contents of fix-magazine-bucket.sql in your Supabase SQL editor
   ```

2. **Verify the setup:**
   - Check that the `magazine-images` bucket exists in Supabase Storage
   - Ensure it's set to public access
   - Verify RLS policies are in place

3. **Test the functionality:**
   - Create a new article with image blocks
   - Upload images and verify they appear in the preview
   - Save the article and check if images persist
   - View the published article to ensure images display

## How Image Upload Works

1. User adds an image block in the article editor
2. `SimpleImageUpload` component handles file selection/paste/drop
3. `ImageUploadService.uploadMagazineImage()` uploads to Supabase Storage
4. Returns public URL which is stored in the content block
5. Content blocks are saved as JSONB in the `magazine_articles` table
6. When displaying, the image URL is used directly in an `<img>` tag

## Debugging Tips

If images still don't appear:
1. Check browser console for errors
2. Verify image URLs are being saved (check the console logs)
3. Ensure Supabase Storage bucket is accessible
4. Check network tab for 404 errors on image URLs
5. Verify content_blocks are properly saved in the database

## Next Steps

After applying these fixes, magazine article images should:
- Upload successfully to the magazine-images bucket
- Display in the article preview while editing
- Persist when the article is saved
- Show correctly when viewing the published article