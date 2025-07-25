import { getCorsHeaders } from '../_shared/cors.ts';

// Google Maps Proxy Edge Function
// Securely handles Google Maps API requests from the client
// Keeps API key server-side and protected

interface PlacesSearchRequest {
  query: string;
  maxResults?: number;
}

interface GeocodeRequest {
  latitude: number;
  longitude: number;
}

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

if (!GOOGLE_MAPS_API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY environment variable is required');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Only allow POST requests for security
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    // Verify API key is configured
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    // Temporarily skip authentication for testing
    // TODO: Implement proper Supabase Row Level Security (RLS) authentication
    console.log('Processing request for:', pathname);

    // Parse request body
    const body = await req.json();

    // Route to appropriate Google Maps API endpoint
    if (pathname.endsWith('/places-search')) {
      return await handlePlacesSearch(body as PlacesSearchRequest);
    } else if (pathname.endsWith('/geocode')) {
      return await handleGeocode(body as GeocodeRequest);
    } else {
      throw new Error('Invalid endpoint');
    }

  } catch (error) {
    console.error('Google Maps Proxy Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Handle Google Places API text search
async function handlePlacesSearch(request: PlacesSearchRequest): Promise<Response> {
  const { query, maxResults = 5 } = request;

  // Validate input
  if (!query || query.trim().length < 3) {
    throw new Error('Query must be at least 3 characters long');
  }

  // Sanitize query for URL
  const sanitizedQuery = encodeURIComponent(query.trim());
  
  // Build Google Places API URL (using Text Search)
  const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${sanitizedQuery}&key=${GOOGLE_MAPS_API_KEY}&type=establishment&fields=place_id,formatted_address,name,geometry,types,address_components`;

  try {
    // Make request to Google Places API
    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API Error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Transform Google Places response to match our interface
    const places = (data.results || []).slice(0, maxResults).map((place: any) => ({
      place_id: place.place_id || '',
      formatted_address: place.formatted_address || '',
      name: place.name || '',
      geometry: {
        location: {
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0
        }
      },
      types: place.types || [],
      address_components: (place.address_components || []).map((component: any) => ({
        long_name: component.long_name,
        short_name: component.short_name,
        types: component.types
      }))
    }));

    return new Response(
      JSON.stringify({
        success: true,
        results: places,
        status: data.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Places search error:', error);
    throw new Error('Failed to search places');
  }
}

// Handle Google Geocoding API reverse geocoding
async function handleGeocode(request: GeocodeRequest): Promise<Response> {
  const { latitude, longitude } = request;

  // Validate coordinates
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Valid latitude and longitude are required');
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates provided');
  }

  // Build Google Geocoding API URL
  const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&result_type=street_address|route|neighborhood|locality|administrative_area_level_1|country`;

  try {
    // Make request to Google Geocoding API
    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Geocoding API Error:', data.status, data.error_message);
      throw new Error(`Google Geocoding API error: ${data.status}`);
    }

    // Transform response
    const result = data.results?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({
          success: true,
          result: null,
          status: 'ZERO_RESULTS'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const geocodeResult = {
      place_id: result.place_id,
      formatted_address: result.formatted_address,
      name: result.formatted_address,
      geometry: {
        location: {
          lat: latitude,
          lng: longitude
        }
      },
      types: result.types || [],
      address_components: (result.address_components || []).map((component: any) => ({
        long_name: component.long_name,
        short_name: component.short_name,
        types: component.types
      }))
    };

    return new Response(
      JSON.stringify({
        success: true,
        result: geocodeResult,
        status: data.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode coordinates');
  }
}