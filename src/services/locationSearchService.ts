export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationResult {
  name?: string;
  address: string;
  coordinates: LocationCoordinates;
  city: string;
  state: string;
  country: string;
  formatted: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  coordinates: LocationCoordinates;
  type: 'saved' | 'recent' | 'favorite';
  lastUsed: Date;
  useCount: number;
}

export interface LocationFilterOptions {
  sortByDistance?: boolean;
  maxResults?: number;
}

// Enhanced location suggestions focusing on stepping community hubs
const mockLocations: LocationResult[] = [
  {
    name: "Chicago, IL",
    address: "Chicago",
    coordinates: { lat: 41.8781, lng: -87.6298 },
    city: "Chicago",
    state: "IL", 
    country: "USA",
    formatted: "Chicago, IL, USA"
  },
  {
    name: "Atlanta, GA",
    address: "Atlanta",
    coordinates: { lat: 33.7490, lng: -84.3880 },
    city: "Atlanta",
    state: "GA",
    country: "USA",
    formatted: "Atlanta, GA, USA"
  },
  {
    name: "Detroit, MI",
    address: "Detroit",
    coordinates: { lat: 42.3314, lng: -83.0458 },
    city: "Detroit",
    state: "MI",
    country: "USA",
    formatted: "Detroit, MI, USA"
  },
  {
    name: "Houston, TX",
    address: "Houston",
    coordinates: { lat: 29.7604, lng: -95.3698 },
    city: "Houston",
    state: "TX",
    country: "USA", 
    formatted: "Houston, TX, USA"
  },
  {
    name: "Dallas, TX",
    address: "Dallas",
    coordinates: { lat: 32.7767, lng: -96.7970 },
    city: "Dallas",
    state: "TX",
    country: "USA",
    formatted: "Dallas, TX, USA"
  },
  {
    name: "Memphis, TN",
    address: "Memphis",
    coordinates: { lat: 35.1495, lng: -90.0490 },
    city: "Memphis",
    state: "TN",
    country: "USA",
    formatted: "Memphis, TN, USA"
  },
  {
    name: "Milwaukee, WI",
    address: "Milwaukee",
    coordinates: { lat: 43.0389, lng: -87.9065 },
    city: "Milwaukee",
    state: "WI",
    country: "USA",
    formatted: "Milwaukee, WI, USA"
  }
];

export const getLocationSuggestions = async (query: string): Promise<LocationResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (!query || query.length < 2) {
    return [];
  }
  
  // Filter mock locations based on query
  return mockLocations.filter(location => 
    location.address.toLowerCase().includes(query.toLowerCase()) ||
    location.city.toLowerCase().includes(query.toLowerCase()) ||
    location.state.toLowerCase().includes(query.toLowerCase())
  );
};

export const getCurrentLocation = async (): Promise<LocationCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
};

export const getRecentLocations = (): SavedLocation[] => {
  try {
    const stored = localStorage.getItem('recentLocations');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const getFavoriteLocations = (): SavedLocation[] => {
  try {
    const stored = localStorage.getItem('favoriteLocations'); 
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addToRecentLocations = (location: LocationResult): void => {
  try {
    const recent = getRecentLocations();
    const savedLocation: SavedLocation = {
      id: Date.now().toString(),
      name: location.name || location.address,
      address: location.formatted,
      coordinates: location.coordinates,
      type: 'recent',
      lastUsed: new Date(),
      useCount: 1
    };
    
    // Remove if already exists and add to front
    const filtered = recent.filter(item => item.address !== location.formatted);
    const updated = [savedLocation, ...filtered].slice(0, 10); // Keep last 10
    
    localStorage.setItem('recentLocations', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent location:', error);
  }
};

// Enhanced distance calculation using Haversine formula
export const calculateDistance = (
  coord1: LocationCoordinates,
  coord2: LocationCoordinates
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

// Get formatted distance text with appropriate units
export const getDistanceText = (
  userLocation: LocationCoordinates,
  targetLocation: LocationCoordinates
): string => {
  const distance = calculateDistance(userLocation, targetLocation);
  return distance < 1 
    ? `${(distance * 5280).toFixed(0)} ft`
    : `${distance.toFixed(1)} mi`;
};

// Filter items by location with distance-based sorting and radius filtering
export const filterByLocation = <T extends { coordinates?: LocationCoordinates | null }>(
  items: T[],
  userLocation: LocationCoordinates,
  radiusMiles: number,
  options: LocationFilterOptions = {}
): T[] => {
  const { sortByDistance = false, maxResults } = options;

  // Filter items within radius (skip items without coordinates)
  let filteredItems = items.filter(item => {
    if (!item.coordinates) return false;
    const distance = calculateDistance(userLocation, item.coordinates);
    return distance <= radiusMiles;
  });

  // Sort by distance if requested
  if (sortByDistance) {
    filteredItems.sort((a, b) => {
      if (!a.coordinates || !b.coordinates) return 0;
      const distanceA = calculateDistance(userLocation, a.coordinates);
      const distanceB = calculateDistance(userLocation, b.coordinates);
      return distanceA - distanceB;
    });
  }

  // Limit results if specified
  if (maxResults && filteredItems.length > maxResults) {
    filteredItems = filteredItems.slice(0, maxResults);
  }

  return filteredItems;
};

// Enhanced location search service with caching
class LocationSearchService {
  private geocodingCache = new Map<string, LocationResult[]>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async searchWithCache(query: string): Promise<LocationResult[]> {
    const cacheKey = query.toLowerCase().trim();
    const cached = this.geocodingCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const results = await getLocationSuggestions(query);
    this.geocodingCache.set(cacheKey, results);
    
    // Auto-clear cache after duration
    setTimeout(() => {
      this.geocodingCache.delete(cacheKey);
    }, this.CACHE_DURATION);

    return results;
  }

  clearCache(): void {
    this.geocodingCache.clear();
  }
}

export const locationSearchService = new LocationSearchService();