# Venue Image Naming Test Guide

## Summary of Changes

We've successfully implemented venue name inclusion in image uploads. Here's what was changed:

### 1. ImageUploadService.ts
- Updated `uploadVenueImage()` to accept an optional `venueName` parameter
- Added logic to sanitize the venue name and create a descriptive filename
- Pattern changed from `{userId}/venues/{venueId}/floor-plan.{ext}` to `{userId}/venues/{venueId}/{sanitized-venue-name}-floor-plan.{ext}`

### 2. SeatingLayoutManager.tsx
- Added `venueId` and `venueName` props
- Modified `handleImageUpload` to use the ImageUploadService for Supabase uploads when venueId is available
- Added tracking of the image file for deferred upload in create mode
- Updated `saveLayout` to pass the image file to the parent component

### 3. VenueManagement.tsx
- Updated `handleVenueLayoutSaved` to handle image uploads after venue creation
- Now passes `venueId` and `venueName` to SeatingLayoutManager
- Handles the two-phase process: create venue first, then upload image with proper naming

## Testing Steps

1. **Test Creating a New Venue:**
   - Navigate to `/dashboard/venues`
   - Click "Create Venue"
   - Enter a venue name (e.g., "Madison Square Garden")
   - Upload a floor plan image
   - Save the venue
   - Check that the image URL includes the venue name (e.g., "madison-square-garden-floor-plan.png")

2. **Test Editing an Existing Venue:**
   - Select an existing venue
   - Upload a new floor plan image
   - The image should be uploaded immediately with the venue name
   - Save the changes

3. **Test Special Characters in Venue Names:**
   - Create venues with names like:
     - "The O2 Arena" → "the-o2-arena-floor-plan"
     - "AT&T Stadium" → "att-stadium-floor-plan"
     - "Café de la Paix Hall" → "caf-de-la-paix-hall-floor-plan"

## Benefits

1. **Better Organization**: Images are now clearly identifiable by venue name
2. **Easier Debugging**: Support teams can quickly identify which image belongs to which venue
3. **Improved User Experience**: More descriptive URLs when sharing or downloading images
4. **SEO Benefits**: Descriptive filenames are better for search engines if images are publicly accessible

## File Naming Examples

- Old: `user123/venues/venue456/floor-plan.png`
- New: `user123/venues/venue456/madison-square-garden-floor-plan.png`

## Notes

- Venue names are sanitized to remove special characters and spaces
- Names are limited to 50 characters to prevent excessively long filenames
- The system maintains backward compatibility with existing venues