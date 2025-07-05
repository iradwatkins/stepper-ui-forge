import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  Zap,
  Info,
  CheckCircle,
  AlertTriangle,
  Car,
  Bus,
  Train,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced seat types with additional properties
export interface EnhancedSeat {
  id: string;
  row: string;
  number: string;
  type: 'regular' | 'premium' | 'vip' | 'ada' | 'table' | 'standing';
  status: 'available' | 'selected' | 'occupied' | 'reserved' | 'blocked';
  price: number;
  x: number;
  y: number;
  amenities?: string[];
  view_quality?: 'excellent' | 'good' | 'standard' | 'limited';
  accessibility_features?: string[];
  table_id?: string;
  group_size?: number;
}

export interface SeatingSection {
  id: string;
  name: string;
  description: string;
  seats: EnhancedSeat[];
  pricing_tier: 'budget' | 'standard' | 'premium' | 'vip';
  amenities: string[];
  view_description: string;
}

export interface LocationInfo {
  name: string;
  address: string;
  parking_info: {
    available: boolean;
    cost: string;
    capacity: number;
    distance: string;
  };
  transit_options: Array<{
    type: 'bus' | 'train' | 'metro' | 'rideshare';
    description: string;
    travel_time: string;
    cost: string;
  }>;
  nearby_amenities: string[];
  accessibility: string[];
}

interface EnhancedSeatingChartSelectorProps {
  eventId: string;
  venueId: string;
  onSeatSelection: (seats: EnhancedSeat[]) => void;
  selectedSeats: EnhancedSeat[];
  maxSeats?: number;
  showLocationInfo?: boolean;
  showRecommendations?: boolean;
}

export const EnhancedSeatingChartSelector: React.FC<EnhancedSeatingChartSelectorProps> = ({
  eventId,
  venueId,
  onSeatSelection,
  selectedSeats,
  maxSeats = 8,
  showLocationInfo = true,
  showRecommendations = true
}) => {
  const [sections, setSections] = useState<SeatingSection[]>([]);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [viewQualityFilter, setViewQualityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('seating');

  // Mock data - in production, this would come from API
  useEffect(() => {
    const mockSections: SeatingSection[] = [
      {
        id: 'floor',
        name: 'Dance Floor',
        description: 'General admission standing area with excellent stage view',
        pricing_tier: 'standard',
        amenities: ['bar_access', 'coat_check', 'restrooms_nearby'],
        view_description: 'Excellent view of main stage, close to dance action',
        seats: Array.from({ length: 50 }, (_, i) => ({
          id: `floor-${i + 1}`,
          row: 'GA',
          number: `${i + 1}`,
          type: 'standing' as const,
          status: Math.random() > 0.3 ? 'available' : 'occupied' as const,
          price: 45,
          x: (i % 10) * 60 + 50,
          y: Math.floor(i / 10) * 40 + 100,
          view_quality: 'excellent' as const,
          amenities: ['bar_access']
        }))
      },
      {
        id: 'vip_tables',
        name: 'VIP Tables',
        description: 'Reserved tables with premium service and priority access',
        pricing_tier: 'vip',
        amenities: ['premium_bar', 'dedicated_server', 'priority_parking', 'coat_check'],
        view_description: 'Elevated view with table service and premium amenities',
        seats: Array.from({ length: 8 }, (_, i) => ({
          id: `vip-table-${i + 1}`,
          row: 'VIP',
          number: `T${i + 1}`,
          type: 'table' as const,
          status: Math.random() > 0.5 ? 'available' : 'occupied' as const,
          price: 120,
          x: (i % 4) * 100 + 600,
          y: Math.floor(i / 4) * 80 + 80,
          view_quality: 'excellent' as const,
          amenities: ['premium_bar', 'table_service'],
          group_size: 4,
          table_id: `vip-table-${i + 1}`
        }))
      },
      {
        id: 'balcony',
        name: 'Balcony Seating',
        description: 'Elevated seating with great overview of the entire venue',
        pricing_tier: 'premium',
        amenities: ['bar_access', 'reserved_seating', 'coat_check'],
        view_description: 'Great overview perspective, perfect for watching performances',
        seats: Array.from({ length: 24 }, (_, i) => ({
          id: `balcony-${i + 1}`,
          row: String.fromCharCode(65 + Math.floor(i / 6)), // A, B, C, D
          number: `${(i % 6) + 1}`,
          type: 'premium' as const,
          status: Math.random() > 0.4 ? 'available' : 'occupied' as const,
          price: 75,
          x: (i % 6) * 50 + 200,
          y: Math.floor(i / 6) * 35 + 300,
          view_quality: 'good' as const,
          amenities: ['reserved_seating']
        }))
      },
      {
        id: 'ada_section',
        name: 'Accessible Seating',
        description: 'ADA compliant seating with wheelchair accessibility',
        pricing_tier: 'standard',
        amenities: ['wheelchair_accessible', 'companion_seating', 'accessible_restrooms'],
        view_description: 'Good stage view with full accessibility features',
        seats: Array.from({ length: 6 }, (_, i) => ({
          id: `ada-${i + 1}`,
          row: 'ADA',
          number: `${i + 1}`,
          type: 'ada' as const,
          status: Math.random() > 0.7 ? 'available' : 'occupied' as const,
          price: 45,
          x: i * 80 + 100,
          y: 450,
          view_quality: 'good' as const,
          accessibility_features: ['wheelchair_accessible', 'companion_seating'],
          amenities: ['accessible_restrooms']
        }))
      }
    ];

    const mockLocationInfo: LocationInfo = {
      name: 'SteppersLife Dance Center',
      address: '123 Dance Street, San Francisco, CA 94102',
      parking_info: {
        available: true,
        cost: '$15 flat rate',
        capacity: 200,
        distance: '50 yards from entrance'
      },
      transit_options: [
        {
          type: 'metro',
          description: 'BART Powell Street Station',
          travel_time: '5 min walk',
          cost: '$3.50-$12'
        },
        {
          type: 'bus',
          description: 'Muni Lines 2, 3, 30, 45',
          travel_time: '2 min walk',
          cost: '$3.00'
        },
        {
          type: 'rideshare',
          description: 'Uber/Lyft pickup zone',
          travel_time: 'Drop-off at venue',
          cost: '$8-$25'
        }
      ],
      nearby_amenities: [
        'Union Square Shopping (3 blocks)',
        'Various restaurants within 2 blocks',
        'Westfield Mall (4 blocks)',
        'Hotels within walking distance'
      ],
      accessibility: [
        'Wheelchair accessible entrance',
        'Elevator access to all floors',
        'Accessible restrooms',
        'Reserved ADA parking spaces',
        'Audio assistance available'
      ]
    };

    setSections(mockSections);
    setLocationInfo(mockLocationInfo);
    setIsLoading(false);
  }, [eventId, venueId]);

  // Filter seats based on current filters
  const getFilteredSeats = () => {
    let allSeats: EnhancedSeat[] = [];
    
    sections.forEach(section => {
      if (selectedSection === 'all' || section.id === selectedSection) {
        allSeats = [...allSeats, ...section.seats];
      }
    });

    return allSeats.filter(seat => {
      if (priceFilter !== 'all') {
        const priceRange = priceFilter.split('-').map(Number);
        if (priceRange.length === 2 && (seat.price < priceRange[0] || seat.price > priceRange[1])) {
          return false;
        }
      }

      if (viewQualityFilter !== 'all' && seat.view_quality !== viewQualityFilter) {
        return false;
      }

      return true;
    });
  };

  const handleSeatClick = (seat: EnhancedSeat) => {
    if (seat.status !== 'available') return;

    const isSelected = selectedSeats.find(s => s.id === seat.id);
    let newSelection: EnhancedSeat[] = [];

    if (isSelected) {
      // Remove seat from selection
      newSelection = selectedSeats.filter(s => s.id !== seat.id);
    } else {
      // Add seat to selection (respect max seats limit)
      if (selectedSeats.length < maxSeats) {
        newSelection = [...selectedSeats, { ...seat, status: 'selected' }];
      } else {
        return; // Don't add if at max capacity
      }
    }

    onSeatSelection(newSelection);
  };

  const getSeatIcon = (type: string) => {
    switch (type) {
      case 'vip':
      case 'table':
        return <Zap className="h-3 w-3" />;
      case 'ada':
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getSeatColor = (seat: EnhancedSeat) => {
    const isSelected = selectedSeats.find(s => s.id === seat.id);
    
    if (isSelected) return 'bg-stepping-purple text-white';
    
    switch (seat.status) {
      case 'available':
        switch (seat.type) {
          case 'vip':
          case 'table':
            return 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200';
          case 'premium':
            return 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200';
          case 'ada':
            return 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200';
          default:
            return 'bg-gray-100 border-gray-400 text-gray-800 hover:bg-gray-200';
        }
      case 'occupied':
        return 'bg-red-100 border-red-400 text-red-800 cursor-not-allowed';
      case 'reserved':
        return 'bg-orange-100 border-orange-400 text-orange-800 cursor-not-allowed';
      default:
        return 'bg-gray-300 border-gray-500 text-gray-600 cursor-not-allowed';
    }
  };

  const totalSelectedPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="seating">Select Seats</TabsTrigger>
          {showLocationInfo && <TabsTrigger value="location">Location Info</TabsTrigger>}
          {showRecommendations && <TabsTrigger value="recommendations">Recommendations</TabsTrigger>}
        </TabsList>

        <TabsContent value="seating" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Seating Selection
              </CardTitle>
              <CardDescription>
                Choose your preferred seats. Selected: {selectedSeats.length}/{maxSeats}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Section</label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map(section => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price Range</label>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="0-50">$0 - $50</SelectItem>
                      <SelectItem value="51-100">$51 - $100</SelectItem>
                      <SelectItem value="101-200">$101+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">View Quality</label>
                  <Select value={viewQualityFilter} onValueChange={setViewQualityFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Views</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seat Map */}
              <div className="border rounded-lg p-4 bg-gray-50 relative overflow-auto">
                <div className="relative w-full h-96 bg-white rounded border-2 border-dashed border-gray-300">
                  {/* Stage */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-2 rounded">
                    STAGE
                  </div>

                  {/* Seats */}
                  {getFilteredSeats().map(seat => (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      className={cn(
                        'absolute w-8 h-8 border-2 rounded flex items-center justify-center text-xs font-medium transition-colors',
                        getSeatColor(seat)
                      )}
                      style={{
                        left: seat.x,
                        top: seat.y
                      }}
                      disabled={seat.status !== 'available' && !selectedSeats.find(s => s.id === seat.id)}
                      title={`${seat.row}${seat.number} - $${seat.price} - ${seat.type} - ${seat.status}`}
                    >
                      {getSeatIcon(seat.type) || seat.number}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-400 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-stepping-purple rounded"></div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-400 rounded"></div>
                    <span>Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded flex items-center justify-center">
                      <Zap className="h-2 w-2" />
                    </div>
                    <span>VIP/Table</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-400 rounded flex items-center justify-center">
                      <Users className="h-2 w-2" />
                    </div>
                    <span>ADA Accessible</span>
                  </div>
                </div>
              </div>

              {/* Selection Summary */}
              {selectedSeats.length > 0 && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Selected Seats:</strong> {selectedSeats.map(s => `${s.row}${s.number}`).join(', ')} 
                    <br />
                    <strong>Total:</strong> ${totalSelectedPrice.toFixed(2)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showLocationInfo && locationInfo && (
          <TabsContent value="location">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Parking Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Parking Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Availability:</span>
                    <Badge variant={locationInfo.parking_info.available ? 'default' : 'destructive'}>
                      {locationInfo.parking_info.available ? 'Available' : 'Limited'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-medium">{locationInfo.parking_info.cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span>{locationInfo.parking_info.capacity} spaces</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span>{locationInfo.parking_info.distance}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Transit Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5" />
                    Public Transit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {locationInfo.transit_options.map((option, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {option.type === 'metro' && <Train className="h-4 w-4" />}
                        {option.type === 'bus' && <Bus className="h-4 w-4" />}
                        {option.type === 'rideshare' && <Car className="h-4 w-4" />}
                        <span className="font-medium capitalize">{option.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      <div className="flex justify-between text-sm mt-2">
                        <span>Travel time: {option.travel_time}</span>
                        <span>Cost: {option.cost}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Nearby Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Nearby Amenities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {locationInfo.nearby_amenities.map((amenity, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-stepping-purple rounded-full"></div>
                        <span className="text-sm">{amenity}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Accessibility */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Accessibility Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {locationInfo.accessibility.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {showRecommendations && (
          <TabsContent value="recommendations">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Seating Recommendations
                  </CardTitle>
                  <CardDescription>
                    Based on this event type and your preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <strong>For Dance Events:</strong> VIP tables offer the best experience with dedicated service and great views of the dance floor.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      <strong>General Admission:</strong> Perfect for dancing and mingling. Get close to the action on the dance floor.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Balcony Seating:</strong> Great for watching performances and lessons, but limited dancing space.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Section Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map(section => (
                  <Card key={section.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {section.pricing_tier}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
                      <p className="text-sm mb-3"><strong>View:</strong> {section.view_description}</p>
                      <div className="flex flex-wrap gap-1">
                        {section.amenities.map(amenity => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};