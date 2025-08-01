# Google Maps API Setup Guide

## Current Configuration

The Google Maps API is configured in the codebase with the following:

1. **API Key**: Stored in `.env` file as `VITE_GOOGLE_MAPS_API_KEY`
2. **Libraries**: Places API and Marker API are loaded
3. **Component**: `GooglePlacesInput` component handles address autocomplete

## API Key Requirements

For the Google Places Autocomplete to work properly, ensure your Google Maps API key has the following APIs enabled in the Google Cloud Console:

1. **Maps JavaScript API** - For basic map functionality
2. **Places API** - For address autocomplete and place search
3. **Geocoding API** - For converting addresses to coordinates

## Troubleshooting

If the address autocomplete is not working:

### 1. Check API Key Permissions
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Navigate to "APIs & Services" → "Credentials"
- Click on your API key
- Ensure the following APIs are enabled:
  - Maps JavaScript API
  - Places API
  - Geocoding API

### 2. Check API Key Restrictions
- In the API key settings, check "Application restrictions"
- For development: Set to "None" or add your localhost URLs
- For production: Add your domain to "Website restrictions"

### 3. Check Billing
- Google Maps APIs require a billing account
- Ensure billing is enabled for your Google Cloud project
- You get $200 free credit monthly, which is usually sufficient for development

### 4. Check Browser Console
Common errors and solutions:
- `REQUEST_DENIED`: API key doesn't have proper permissions
- `OVER_QUERY_LIMIT`: You've exceeded the quota
- `Invalid API key`: The key is incorrect or disabled

### 5. Test the API Key
You can test if your API key works by visiting:
```
https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places
```

## Component Usage

The venue address fields have been updated to use `GooglePlacesInput`:

```typescript
<GooglePlacesInput
  value={form.watch('address') || ''}
  onChange={(value, placeData) => {
    form.setValue('address', value)
    if (placeData) {
      // Access coordinates: placeData.geometry.location
      // Access place ID: placeData.place_id
    }
  }}
  placeholder="Search for venue, address, or landmark..."
  error={!!form.formState.errors.address}
  className="w-full"
/>
```

## Updated Components

The following components now use GooglePlacesInput for venue addresses:
- `CreatePremiumEvent.tsx` - Premium event creation
- `VenueManagementPremiumEvent.tsx` - Venue-based premium event creation
- `BasicInformation.tsx` - Regular event creation (already using it)
- `EditEvent.tsx` - Event editing (already using it)

## Benefits

Using GooglePlacesInput provides:
- Address autocomplete for faster entry
- Verification of real addresses
- Automatic extraction of city, state, country
- GPS coordinates for mapping
- Current location detection
- Better user experience with visual feedback