import { supabase } from '@/lib/supabase';

// Secure Google Maps Service using Supabase Edge Function proxy
// This keeps the API key server-side and provides secure access to Google Maps APIs

export interface PlaceResult {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface GoogleMapsServiceResponse<T> {
  success: boolean;
  error?: string;
  results?: T[];
  result?: T;
  status?: string;
}

class GoogleMapsService {
  private readonly baseUrl: string;

  constructor() {
    // Use Supabase Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL environment variable is required');
    }
    this.baseUrl = `${supabaseUrl}/functions/v1/google-maps-proxy`;
  }

  /**
   * Search for places using Google Places API via secure proxy
   */
  async searchPlaces(query: string, maxResults: number = 5): Promise<PlaceResult[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/places-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          query: query.trim(),
          maxResults
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GoogleMapsServiceResponse<PlaceResult> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Places search failed');
      }

      return data.results || [];

    } catch (error) {
      console.error('Places search error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          throw new Error('Please log in to use location search');
        } else if (error.message.includes('OVER_QUERY_LIMIT')) {
          throw new Error('Location search temporarily unavailable - quota exceeded');
        } else if (error.message.includes('REQUEST_DENIED')) {
          throw new Error('Location search access denied - check API configuration');
        }
      }
      
      throw new Error('Unable to search locations. Please try again or enter address manually.');
    }
  }

  /**
   * Reverse geocode coordinates to get address using Google Geocoding API via secure proxy
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<PlaceResult | null> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          latitude,
          longitude
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GoogleMapsServiceResponse<PlaceResult> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Geocoding failed');
      }

      return data.result || null;

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          throw new Error('Please log in to use location services');
        }
      }
      
      throw new Error('Unable to get address for current location. Please try again.');
    }
  }

  /**
   * Get current location using browser's geolocation API and reverse geocoding
   */
  async getCurrentLocationAddress(): Promise<PlaceResult | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const result = await this.reverseGeocode(latitude, longitude);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Check if the Google Maps service is available (always true since we use secure proxy)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get service status information
   */
  getStatus(): { available: boolean; message: string } {
    return {
      available: true,
      message: 'Location services available via secure proxy'
    };
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
export default googleMapsService;