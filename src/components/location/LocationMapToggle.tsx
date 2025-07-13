import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Grid3X3, List, Map, MapPin, Filter } from 'lucide-react';
import { LocationCoordinates } from '@/services/locationSearchService';

type ViewMode = 'grid' | 'list' | 'map';

interface LocationMapToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resultsCount: number;
  locationEnabled?: boolean;
  userLocation?: LocationCoordinates | null;
  radius?: number;
  className?: string;
  showFilterSummary?: boolean;
}

const LocationMapToggle: React.FC<LocationMapToggleProps> = ({
  viewMode,
  onViewModeChange,
  resultsCount,
  locationEnabled = false,
  userLocation = null,
  radius,
  className = "",
  showFilterSummary = true
}) => {
  const formatRadius = (value: number): string => {
    return value === 100 ? "100+ miles" : `${value} miles`;
  };

  const getResultsText = (): string => {
    if (resultsCount === 0) {
      return "No results found";
    }
    
    const itemText = resultsCount === 1 ? "result" : "results";
    
    if (locationEnabled && userLocation && radius) {
      return `${resultsCount} ${itemText} within ${formatRadius(radius)}`;
    }
    
    return `${resultsCount} ${itemText}`;
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {getResultsText()}
              </span>
              
              {locationEnabled && userLocation && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  GPS Enabled
                </Badge>
              )}
            </div>

            {/* Filter Summary */}
            {showFilterSummary && locationEnabled && userLocation && radius && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="w-3 h-3" />
                <span>
                  Location: {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)} 
                  • Radius: {formatRadius(radius)}
                </span>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="h-8 px-3"
              title="List view"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">List</span>
            </Button>
            
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="h-8 px-3"
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Grid</span>
            </Button>
            
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('map')}
              className="h-8 px-3"
              title="Map view"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Map</span>
            </Button>
          </div>
        </div>

        {/* Additional Context */}
        {resultsCount === 0 && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {locationEnabled && userLocation && radius ? (
                <>
                  Try expanding your search radius or adjusting your location filters.
                  Currently searching within {formatRadius(radius)} of your location.
                </>
              ) : (
                <>
                  Try adjusting your search terms or filters. 
                  Enable location filtering to find nearby options.
                </>
              )}
            </p>
          </div>
        )}

        {/* Location Help */}
        {!locationEnabled && resultsCount > 0 && showFilterSummary && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Enable location filtering to see distance information and find nearby options.
              </p>
            </div>
          </div>
        )}

        {/* Map View Notice */}
        {viewMode === 'map' && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-start gap-2">
              <Map className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  Map View
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Interactive map showing all {resultsCount} locations with markers and details.
                  {locationEnabled && userLocation && " Your current location is highlighted."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationMapToggle;