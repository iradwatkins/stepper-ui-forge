import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadGoogleMapsAPI } from '@/lib/config/google-maps';

interface PlaceResult {
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

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string, placeData?: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  onPlaceSelected?: (place: PlaceResult) => void;
}

export const GooglePlacesInput = ({
  value,
  onChange,
  placeholder = "Search for a location...",
  className,
  disabled = false,
  error = false,
  onPlaceSelected
}: GooglePlacesInputProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Load Google Maps API only when needed (lazy loading)
  const initGoogleMapsAPI = async () => {
    if (apiLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      await loadGoogleMapsAPI();
      setApiLoaded(true);
      console.log('✅ Google Maps API loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Google Maps API:', error);
      setApiLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if Google Places API is available
  const isGoogleMapsLoaded = () => {
    return apiLoaded && 
           typeof window !== 'undefined' && 
           window.google && 
           window.google.maps && 
           window.google.maps.places;
  };

  // Search for places using new Places API
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Load API if not already loaded
    if (!apiLoaded) {
      await initGoogleMapsAPI();
    }

    if (!isGoogleMapsLoaded()) {
      console.warn('Google Maps Places API not loaded, using fallback');
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Always use legacy PlacesService API since new API requires additional setup
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        query: query,
        fields: ['place_id', 'formatted_address', 'name', 'geometry', 'types', 'address_components']
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const places = results.slice(0, 5).map(place => ({
            place_id: place.place_id || '',
            formatted_address: place.formatted_address || '',
            name: place.name || '',
            geometry: {
              location: {
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0
              }
            },
            types: place.types || [],
            address_components: place.address_components?.map(component => ({
              long_name: component.long_name,
              short_name: component.short_name,
              types: component.types
            })) || []
          })) as PlaceResult[];
          
          setSuggestions(places);
          setIsOpen(true);
        } else {
          console.warn('Places search failed:', status);
          setSuggestions([]);
          
          // Handle specific error statuses
          if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
            console.warn('Google Places API request denied - check API key permissions');
          } else if (status === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
            console.warn('Google Places API quota exceeded');
          }
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error searching places:', error);
      setIsLoading(false);
      setSuggestions([]);
      
      // If API error, provide fallback message
      if (error instanceof Error && (error.message.includes('PERMISSION_DENIED') || error.message.includes('403'))) {
        console.warn('Google Places API access denied. Component will work in basic mode.');
      } else if (error instanceof Error && error.message.includes('OVER_QUERY_LIMIT')) {
        console.warn('Google Places API quota exceeded. Component will work in basic mode.');
      } else {
        console.warn('Google Places API error:', error);
      }
    }
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setUseCurrentLocation(true);
    
    // Load API if not already loaded
    if (!apiLoaded) {
      await initGoogleMapsAPI();
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (!isGoogleMapsLoaded()) {
          setUseCurrentLocation(false);
          return;
        }

        try {
          const geocoder = new window.google.maps.Geocoder();
          const result = await new Promise<any[]>((resolve, reject) => {
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results, status) => {
                if (status === 'OK' && results) {
                  resolve(results);
                } else {
                  reject(new Error('Geocoding failed'));
                }
              }
            );
          });

          if (result && result[0]) {
            const place = result[0];
            const placeData: PlaceResult = {
              place_id: place.place_id,
              formatted_address: place.formatted_address,
              name: place.formatted_address,
              geometry: {
                location: {
                  lat: latitude,
                  lng: longitude
                }
              },
              types: place.types,
              address_components: place.address_components.map((component: any) => ({
                long_name: component.long_name,
                short_name: component.short_name,
                types: component.types
              }))
            };

            onChange(place.formatted_address, placeData);
            onPlaceSelected?.(placeData);
          }
        } catch (error) {
          console.error('Error getting current location address:', error);
        } finally {
          setUseCurrentLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setUseCurrentLocation(false);
      }
    );
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for search
    timeoutRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (place: PlaceResult) => {
    onChange(place.formatted_address, place);
    onPlaceSelected?.(place);
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle clear input
  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (inputRef.current && !inputRef.current.contains(target) && 
          !target.closest('[data-suggestions-list]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPlaceTypeIcon = (types: string[]) => {
    if (types.includes('restaurant') || types.includes('food')) return '🍽️';
    if (types.includes('school') || types.includes('university')) return '🏫';
    if (types.includes('hospital')) return '🏥';
    if (types.includes('park')) return '🌳';
    if (types.includes('shopping_mall') || types.includes('store')) return '🏬';
    if (types.includes('lodging')) return '🏨';
    if (types.includes('church') || types.includes('place_of_worship')) return '⛪';
    return '📍';
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={cn(
              "pl-10 pr-10",
              error && "border-destructive",
              className
            )}
            disabled={disabled}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={useCurrentLocation || disabled}
          className="flex items-center gap-1"
        >
          <Navigation className="h-4 w-4" />
          {useCurrentLocation ? 'Getting...' : 'Current'}
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <Card 
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto"
          data-suggestions-list
        >
          <CardContent className="p-0">
            {suggestions.map((place, index) => (
              <div
                key={place.place_id || index}
                className="flex items-start gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                onClick={() => handleSuggestionSelect(place)}
              >
                <div className="text-lg mt-0.5">
                  {getPlaceTypeIcon(place.types)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {place.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {place.formatted_address}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {place.types.slice(0, 2).map(type => (
                      <Badge key={type} variant="secondary" className="text-xs px-1 py-0">
                        {type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card>
            <CardContent className="p-3 text-center text-sm text-muted-foreground">
              Searching for locations...
            </CardContent>
          </Card>
        </div>
      )}

      {/* API loading status */}
      {!apiLoaded && value.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card>
            <CardContent className="p-3 text-center text-sm text-amber-600">
              Loading location search... Please wait or enter address manually.
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Google Maps API warning */}
      {apiLoaded && !isGoogleMapsLoaded() && value.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card>
            <CardContent className="p-3 text-center text-sm text-amber-600">
              Location search unavailable. Please enter address manually.
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};