// Google Maps Configuration
export const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyBMW2IwlZLib2w_wbqfeZVa0r3L1_XXlvM',
  libraries: ['places'] as const,
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
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}&v=${GOOGLE_MAPS_CONFIG.version}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Maps API loaded successfully');
      resolve();
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps API:', error);
      reject(error);
    };

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
    }
  }
}