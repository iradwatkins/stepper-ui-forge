import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, Clock, Star, X, Loader2 } from 'lucide-react';
import { 
  LocationResult, 
  SavedLocation, 
  getLocationSuggestions, 
  getCurrentLocation,
  getRecentLocations,
  getFavoriteLocations,
  addToRecentLocations
} from '@/services/locationSearchService';

interface LocationSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: LocationResult) => void;
  onUseCurrentLocation?: () => void;
  placeholder?: string;
  showGpsButton?: boolean;
  showRecentLocations?: boolean;
  className?: string;
  disabled?: boolean;
}

const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  value,
  onChange,
  onLocationSelect,
  onUseCurrentLocation,
  placeholder = "Search location...",
  showGpsButton = true,
  showRecentLocations = true,
  className = "",
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [recentLocations, setRecentLocations] = useState<SavedLocation[]>([]);
  const [favoriteLocations, setFavoriteLocations] = useState<SavedLocation[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showRecentLocations) {
      setRecentLocations(getRecentLocations());
      setFavoriteLocations(getFavoriteLocations());
    }
  }, [showRecentLocations]);

  useEffect(() => {
    const handleSearch = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await getLocationSuggestions(value);
        setSuggestions(results);
      } catch (error) {
        console.error('Failed to get location suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleLocationSelect = (location: LocationResult | SavedLocation) => {
    const selectedLocation: LocationResult = 'formatted' in location ? location : {
      address: location.name,
      coordinates: location.coordinates,
      city: '',
      state: '',
      country: '',
      formatted: location.address
    };
    
    onChange(selectedLocation.address);
    onLocationSelect(selectedLocation);
    addToRecentLocations(selectedLocation);
    setShowSuggestions(false);
    
    // Refresh recent locations
    if (showRecentLocations) {
      setRecentLocations(getRecentLocations());
    }
  };

  const handleGpsLocation = async () => {
    if (!onUseCurrentLocation) return;
    
    setGpsLoading(true);
    try {
      const location = await getCurrentLocation();
      // Create a location result for "Current Location"
      const currentLocationResult: LocationResult = {
        address: 'Current Location',
        coordinates: location,
        city: '',
        state: '',
        country: '',
        formatted: 'Current Location (GPS)'
      };
      
      onChange('Current Location');
      onLocationSelect(currentLocationResult);
      onUseCurrentLocation();
      setShowSuggestions(false);
    } catch (error) {
      console.error('Failed to get current location:', error);
      alert(error instanceof Error ? error.message : 'Failed to get current location');
    } finally {
      setGpsLoading(false);
    }
  };

  const clearSearch = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const showDropdown = showSuggestions && (
    suggestions.length > 0 || 
    isLoading || 
    (showRecentLocations && value.length === 0 && (recentLocations.length > 0 || favoriteLocations.length > 0))
  );

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-20"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0"
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          
          {showGpsButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGpsLocation}
              disabled={disabled || gpsLoading}
              className="h-6 w-6 p-0"
              title="Use current location"
            >
              {gpsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {showDropdown && (
        <Card 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto"
        >
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching locations...</span>
              </div>
            ) : (
              <>
                {/* Show recent and favorite locations when input is empty */}
                {value.length === 0 && showRecentLocations && (
                  <>
                    {favoriteLocations.length > 0 && (
                      <>
                        <div className="px-3 py-2 border-b">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Favorite Locations
                          </span>
                        </div>
                        {favoriteLocations.map((location) => (
                          <button
                            key={location.id}
                            onClick={() => handleLocationSelect(location)}
                            className="w-full flex items-center p-3 hover:bg-accent transition-colors text-left"
                          >
                            <Star className="w-4 h-4 mr-3 text-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {location.name}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {location.address}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    
                    {recentLocations.length > 0 && (
                      <>
                        <div className="px-3 py-2 border-b">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Recent Searches
                          </span>
                        </div>
                        {recentLocations.map((location) => (
                          <button
                            key={location.id}
                            onClick={() => handleLocationSelect(location)}
                            className="w-full flex items-center p-3 hover:bg-accent transition-colors text-left"
                          >
                            <Clock className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {location.name}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {location.address}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* Show search suggestions */}
                {suggestions.length > 0 && (
                  <>
                    {value.length > 0 && showRecentLocations && (favoriteLocations.length > 0 || recentLocations.length > 0) && (
                      <div className="px-3 py-2 border-b">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Search Results
                        </span>
                      </div>
                    )}
                    {suggestions.map((location, index) => (
                      <button
                        key={index}
                        onClick={() => handleLocationSelect(location)}
                        className="w-full flex items-center p-3 hover:bg-accent transition-colors text-left"
                      >
                        <MapPin className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {location.address}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {location.formatted}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                
                {value.length >= 2 && suggestions.length === 0 && !isLoading && (
                  <div className="p-4 text-center text-muted-foreground">
                    <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No locations found</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocationSearchBar;