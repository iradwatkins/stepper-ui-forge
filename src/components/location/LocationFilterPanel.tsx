import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MapPin, Navigation, RotateCcw, Settings, Target } from 'lucide-react';
import { LocationCoordinates } from '@/services/locationSearchService';

interface LocationFilterPanelProps {
  userLocation: LocationCoordinates | null;
  locationEnabled: boolean;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onLocationToggle: () => void;
  onClearLocation: () => void;
  sortByDistance: boolean;
  onSortByDistanceChange: (enabled: boolean) => void;
  className?: string;
  compact?: boolean;
}

const LocationFilterPanel: React.FC<LocationFilterPanelProps> = ({
  userLocation,
  locationEnabled,
  radius,
  onRadiusChange,
  onLocationToggle,
  onClearLocation,
  sortByDistance,
  onSortByDistanceChange,
  className = "",
  compact = false
}) => {
  const radiusOptions = [5, 10, 15, 25, 50, 100];

  const formatRadius = (value: number): string => {
    return value === 100 ? "100+ miles" : `${value} miles`;
  };

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Location Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Location Filter</span>
              </div>
              {locationEnabled && userLocation && (
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant={locationEnabled ? "default" : "outline"}
                size="sm"
                onClick={onLocationToggle}
                className="flex-1"
              >
                <Navigation className="w-3 h-3 mr-1" />
                {locationEnabled ? 'GPS On' : 'Use GPS'}
              </Button>
              
              {locationEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearLocation}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Radius Control - Compact */}
            {locationEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Radius</span>
                  <span className="text-xs font-medium">{formatRadius(radius)}</span>
                </div>
                <Slider
                  value={[radius]}
                  onValueChange={([value]) => onRadiusChange(value)}
                  max={100}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4" />
          Location Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Status & Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">GPS Location</span>
            {locationEnabled && userLocation && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={locationEnabled ? "default" : "outline"}
              size="sm"
              onClick={onLocationToggle}
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {locationEnabled ? 'Location Enabled' : 'Enable Location'}
            </Button>
            
            {locationEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearLocation}
                title="Clear location filter"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!locationEnabled && (
            <p className="text-xs text-muted-foreground">
              Enable location to filter results by distance and see nearby options.
            </p>
          )}
        </div>

        {/* Radius Selection */}
        {locationEnabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Search Radius</span>
              <span className="text-sm font-mono text-muted-foreground">
                {formatRadius(radius)}
              </span>
            </div>

            {/* Quick Radius Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {radiusOptions.map((option) => (
                <Button
                  key={option}
                  variant={radius === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRadiusChange(option)}
                  className="text-xs"
                >
                  {formatRadius(option)}
                </Button>
              ))}
            </div>

            {/* Slider for Fine Control */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Fine tune:</span>
              <Slider
                value={[radius]}
                onValueChange={([value]) => onRadiusChange(value)}
                max={100}
                min={5}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Sorting Options */}
        {locationEnabled && (
          <div className="space-y-3">
            <span className="text-sm font-medium">Sorting</span>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm">Sort by distance</span>
                <p className="text-xs text-muted-foreground">
                  Show nearest results first
                </p>
              </div>
              <Switch
                checked={sortByDistance}
                onCheckedChange={onSortByDistanceChange}
              />
            </div>
          </div>
        )}

        {/* Location Info */}
        {locationEnabled && userLocation && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium">Your Location</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground">
              Showing results within {formatRadius(radius)} of your location
              {sortByDistance && ', sorted by distance'}
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-start gap-2">
            <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                Location Tips
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Enable GPS for personalized results based on your current location. 
                Adjust the radius to find options within your preferred travel distance.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationFilterPanel;