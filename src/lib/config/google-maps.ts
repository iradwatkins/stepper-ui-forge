// Google Maps Configuration
export const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyBMW2IwlZLib2w_wbqfeZVa0r3L1_XXlvM',
  libraries: ['places', 'marker'] as const,
  version: 'weekly'
};

// Check if Google Maps API key is configured
export const isGoogleMapsEnabled = () => {
  return !!GOOGLE_MAPS_CONFIG.apiKey;
};

// Load Google Maps API dynamically
export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps API already loaded');
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps API script already exists, waiting for load...');
      existingScript.addEventListener('load', () => {
        console.log('Google Maps API loaded from existing script');
        resolve();
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    // Create script element with proper async loading
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}&v=${GOOGLE_MAPS_CONFIG.version}&loading=async`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-api';

    script.onload = () => {
      console.log('Google Maps API loaded successfully with async loading');
      resolve();
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps API:', error);
      reject(error);
    };

    console.log('Loading Google Maps API with URL:', script.src);
    document.head.appendChild(script);
  });
};

// Type definitions for Google Maps API
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    interface Map {}
    interface Marker {}
    interface InfoWindow {}
    
    class Geocoder {
      geocode(
        request: { location: { lat: number; lng: number } },
        callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
      ): void;
    }

    interface GeocoderResult {
      place_id: string;
      formatted_address: string;
      types: string[];
      address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    }

    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

    namespace places {
      // Legacy API (deprecated)
      class PlacesService {
        constructor(attrContainer: Element);
        textSearch(
          request: PlaceSearchRequest,
          callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
        ): void;
      }

      interface PlaceSearchRequest {
        query: string;
        fields: string[];
      }

      interface PlaceResult {
        place_id?: string;
        formatted_address?: string;
        name?: string;
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
        types?: string[];
        address_components?: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }

      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        INVALID_REQUEST = 'INVALID_REQUEST',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }

      // New Places API (recommended)
      class Place {
        static searchByText(request: SearchByTextRequest): Promise<SearchByTextResponse>;
        
        id: string;
        formattedAddress: string;
        displayName: string;
        location: LatLng;
        types: string[];
        addressComponents: AddressComponent[];
      }

      interface SearchByTextRequest {
        textQuery: string;
        fields: string[];
        maxResultCount?: number;
        locationBias?: LocationBias;
        languageCode?: string;
        regionCode?: string;
      }

      interface SearchByTextResponse {
        places: Place[];
      }

      interface LatLng {
        lat: number;
        lng: number;
      }

      interface AddressComponent {
        longText: string;
        shortText: string;
        types: string[];
      }

      interface LocationBias {
        circle?: {
          center: LatLng;
          radius: number;
        };
        rectangle?: {
          low: LatLng;
          high: LatLng;
        };
      }
    }
  }
}