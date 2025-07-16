import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Loader2, AlertCircle, List, Grid } from 'lucide-react';
import { isGoogleMapsEnabled, loadGoogleMapsAPI } from '@/lib/config/google-maps';
import { LocationCoordinates } from '@/services/locationSearchService';

interface MapItem {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  description?: string;
  category?: string;
}

interface SimpleMapViewProps {
  items: MapItem[];
  userLocation?: LocationCoordinates | null;
  onItemClick?: (item: MapItem) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  height?: string;
  center?: LocationCoordinates;
}

export const SimpleMapView: React.FC<SimpleMapViewProps> = ({
  items,
  userLocation,
  onItemClick,
  onViewModeChange,
  height = "500px",
  center
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isGoogleMapsEnabled()) {
          throw new Error('Google Maps API key not configured');
        }

        await loadGoogleMapsAPI();

        if (!mapRef.current || !window.google?.maps) {
          throw new Error('Google Maps API failed to load');
        }

        // Default center to Chicago (stepping community hub)
        const mapCenter = center || userLocation || { lat: 41.8781, lng: -87.6298 };

        const map = new google.maps.Map(mapRef.current, {
          zoom: userLocation ? 12 : 6,
          center: mapCenter,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;
        setMapReady(true);
        setLoading(false);

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [center, userLocation]);

  // Update markers when items change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user location marker if available
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markersRef.current.push(userMarker);
    }

    // Add item markers
    const validItems = items.filter(item => 
      item.coordinates && 
      typeof item.coordinates.lat === 'number' && 
      typeof item.coordinates.lng === 'number'
    );

    validItems.forEach((item, index) => {
      if (!item.coordinates) return;

      const marker = new google.maps.Marker({
        position: { lat: item.coordinates.lat, lng: item.coordinates.lng },
        map: mapInstanceRef.current,
        title: item.name,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2 max-w-xs">
            <h3 class="font-semibold text-lg mb-1">${item.name}</h3>
            ${item.address ? `<p class="text-sm text-gray-600 mb-2">${item.address}</p>` : ''}
            ${item.description ? `<p class="text-sm mb-2">${item.description}</p>` : ''}
            ${item.category ? `<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">${item.category}</span>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        // Close other info windows
        infoWindow.open(mapInstanceRef.current, marker);
        if (onItemClick) {
          onItemClick(item);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      mapInstanceRef.current.fitBounds(bounds);
      
      // Don't zoom in too much for single markers
      const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
        if (mapInstanceRef.current && mapInstanceRef.current.getZoom() && mapInstanceRef.current.getZoom()! > 15) {
          mapInstanceRef.current.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }

  }, [items, mapReady, userLocation, onItemClick]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center" style={{ height }}>
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Loading Map</h3>
            <p className="text-muted-foreground">Please wait while we load the interactive map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center" style={{ height }}>
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Map Unavailable</h3>
            <p className="text-muted-foreground mb-6">
              {error.includes('API key') 
                ? 'Maps require configuration. Please use list or grid view.'
                : 'Unable to load the interactive map. Please try again or use an alternative view.'
              }
            </p>
            {onViewModeChange && (
              <div className="flex gap-2 justify-center">
                <Button onClick={() => onViewModeChange('list')} variant="default">
                  <List className="w-4 h-4 mr-2" />
                  Switch to List
                </Button>
                <Button onClick={() => onViewModeChange('grid')} variant="outline">
                  <Grid className="w-4 h-4 mr-2" />
                  Switch to Grid
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div 
          ref={mapRef} 
          style={{ height, width: '100%' }}
          className="rounded-lg"
        />
        {items.length > 0 && (
          <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Showing {items.filter(item => item.coordinates).length} of {items.length} locations
              </span>
              {userLocation && (
                <span className="text-blue-600 dark:text-blue-400">
                  📍 Your location shown
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleMapView;