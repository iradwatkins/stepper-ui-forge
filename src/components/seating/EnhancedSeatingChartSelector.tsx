import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  MapPin, 
  DollarSign, 
  Users, 
  UserCheck,
  Eye,
  Car,
  Bus,
  Utensils,
  Wifi,
  Palette,
  Filter,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  calculateImageDrawInfo, 
  clientToPercentageCoordinates, 
  percentageToCanvasCoordinates,
  getImageDimensions,
  type ImageDrawInfo,
  type Point,
  type ImageDimensions
} from '@/lib/utils/coordinateUtils';

// Types for seat data structure
export interface SeatData {
  id: string;
  x: number; // Percentage coordinates (0-100)
  y: number; // Percentage coordinates (0-100)
  seatNumber: string;
  row?: string;
  section?: string;
  price: number;
  category: string;
  categoryColor: string;
  isADA: boolean;
  status: 'available' | 'selected' | 'sold' | 'reserved' | 'held';
  amenities?: string[];
  viewQuality?: 'excellent' | 'good' | 'fair' | 'limited';
  tableId?: string;
  groupSize?: number;
}

export interface SeatCategory {
  id: string;
  name: string;
  color: string;
  basePrice: number;
  maxCapacity: number;
  amenities: string[];
  viewQuality: 'excellent' | 'good' | 'fair' | 'limited';
}

export interface VenueInfo {
  name: string;
  address: string;
  capacity: number;
  amenities: string[];
  accessibility: string[];
  parking: {
    available: boolean;
    capacity?: number;
    cost?: string;
  };
  transit: {
    nearby: boolean;
    lines?: string[];
  };
}

interface EnhancedSeatingChartSelectorProps {
  venueImageUrl?: string;
  onImageUpload: (file: File) => void;
  onSeatingConfigurationChange: (seats: SeatData[], categories: SeatCategory[]) => void;
  initialSeats?: SeatData[];
  initialCategories?: SeatCategory[];
  venueInfo?: VenueInfo;
  eventType?: 'concert' | 'theater' | 'sports' | 'conference' | 'wedding' | 'other';
}

const DEFAULT_CATEGORIES: SeatCategory[] = [
  {
    id: 'general',
    name: 'General Admission',
    color: '#10B981',
    basePrice: 50,
    maxCapacity: 200,
    amenities: ['Standard seating'],
    viewQuality: 'good'
  },
  {
    id: 'premium',
    name: 'Premium',
    color: '#F59E0B',
    basePrice: 100,
    maxCapacity: 100,
    amenities: ['Premium seating', 'Better view'],
    viewQuality: 'excellent'
  },
  {
    id: 'vip',
    name: 'VIP',
    color: '#8B5CF6',
    basePrice: 200,
    maxCapacity: 50,
    amenities: ['VIP seating', 'Complimentary drinks', 'Meet & greet'],
    viewQuality: 'excellent'
  },
  {
    id: 'ada',
    name: 'ADA Accessible',
    color: '#3B82F6',
    basePrice: 50,
    maxCapacity: 20,
    amenities: ['Wheelchair accessible', 'Companion seating'],
    viewQuality: 'good'
  }
];

const SEAT_TYPES = [
  { value: 'regular', label: 'Regular Seat', icon: Users },
  { value: 'premium', label: 'Premium Seat', icon: Eye },
  { value: 'vip', label: 'VIP Seat', icon: DollarSign },
  { value: 'ada', label: 'ADA Accessible', icon: UserCheck },
  { value: 'table', label: 'Table Seating', icon: Utensils },
  { value: 'standing', label: 'Standing Area', icon: MapPin }
];

export default function EnhancedSeatingChartSelector({
  venueImageUrl,
  onImageUpload,
  onSeatingConfigurationChange,
  initialSeats = [],
  initialCategories = DEFAULT_CATEGORIES,
  venueInfo,
  eventType = 'other'
}: EnhancedSeatingChartSelectorProps) {
  const [activeTab, setActiveTab] = useState('setup');
  const [seats, setSeats] = useState<SeatData[]>(initialSeats);
  const [categories, setCategories] = useState<SeatCategory[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || '');
  const [isPlacingSeats, setIsPlacingSeats] = useState(false);
  const [tool, setTool] = useState<'pan' | 'place' | 'select'>('pan');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Filters
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 500]);
  const [filterViewQuality, setFilterViewQuality] = useState<string>('all');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New state for proper coordinate handling
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [imageDrawInfo, setImageDrawInfo] = useState<ImageDrawInfo | null>(null);

  // Get unique sections from seats
  const sections = React.useMemo(() => {
    const sectionSet = new Set(seats.map(seat => seat.section).filter(Boolean));
    return ['all', ...Array.from(sectionSet)];
  }, [seats]);

  // Filter seats based on current filters
  const filteredSeats = React.useMemo(() => {
    return seats.filter(seat => {
      if (filterSection !== 'all' && seat.section !== filterSection) return false;
      if (seat.price < filterPriceRange[0] || seat.price > filterPriceRange[1]) return false;
      if (filterViewQuality !== 'all' && seat.viewQuality !== filterViewQuality) return false;
      return true;
    });
  }, [seats, filterSection, filterPriceRange, filterViewQuality]);

  // Load and cache venue image with proper dimensions
  useEffect(() => {
    if (!venueImageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      // Get actual image dimensions
      const dimensions: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight
      };
      setImageDimensions(dimensions);
      
      // Calculate how image should be drawn on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const drawInfo = calculateImageDrawInfo(
          dimensions.width,
          dimensions.height,
          canvas.width,
          canvas.height
        );
        setImageDrawInfo(drawInfo);
      }
    };
    img.onerror = () => {
      console.error('Failed to load venue image:', venueImageUrl);
    };
    img.src = venueImageUrl;
  }, [venueImageUrl]);

  // Recalculate image draw info when canvas size changes
  useEffect(() => {
    if (!imageDimensions) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const drawInfo = calculateImageDrawInfo(
        imageDimensions.width,
        imageDimensions.height,
        canvas.width,
        canvas.height
      );
      setImageDrawInfo(drawInfo);
    }
  }, [imageDimensions]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !venueImageUrl || !imageDrawInfo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create image
    const img = new Image();
    img.onload = () => {
      // Save context
      ctx.save();
      
      // Apply zoom and pan
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
      // Draw background image with proper aspect ratio
      ctx.drawImage(
        img,
        imageDrawInfo.drawX,
        imageDrawInfo.drawY,
        imageDrawInfo.drawWidth,
        imageDrawInfo.drawHeight
      );
      
      // Draw seats using percentage coordinates
      filteredSeats.forEach(seat => {
        const category = categories.find(c => c.id === seat.category);
        if (!category) return;

        // Convert percentage coordinates to canvas coordinates
        const canvasCoords = percentageToCanvasCoordinates(
          seat.x,
          seat.y,
          imageDrawInfo
        );
        
        const radius = 8;

        // Draw seat circle
        ctx.beginPath();
        ctx.arc(canvasCoords.x, canvasCoords.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = category.color;
        ctx.fill();
        
        // Draw seat border
        ctx.strokeStyle = seat.status === 'selected' ? '#000' : '#fff';
        ctx.lineWidth = seat.status === 'selected' ? 3 : 1;
        ctx.stroke();

        // Draw ADA indicator
        if (seat.isADA) {
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('♿', canvasCoords.x, canvasCoords.y + 3);
        }

        // Draw seat number
        if (seat.seatNumber) {
          ctx.fillStyle = '#000';
          ctx.font = '8px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(seat.seatNumber, canvasCoords.x, canvasCoords.y - radius - 2);
        }
      });

      // Restore context
      ctx.restore();
    };
    img.src = venueImageUrl;
  }, [venueImageUrl, filteredSeats, categories, zoom, pan, imageDrawInfo]);

  // Canvas event handlers
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || tool !== 'place' || !imageDrawInfo) return;

    // Convert click coordinates to percentage coordinates
    const percentageCoords = clientToPercentageCoordinates(
      event.clientX,
      event.clientY,
      canvasRef.current,
      imageDrawInfo,
      { pan, zoom }
    );

    // Check if clicking on existing seat
    const clickedSeat = seats.find(seat => {
      const dx = Math.abs(seat.x - percentageCoords.x);
      const dy = Math.abs(seat.y - percentageCoords.y);
      return dx < 2 && dy < 2; // 2% tolerance
    });

    if (clickedSeat) {
      // Remove seat
      const newSeats = seats.filter(s => s.id !== clickedSeat.id);
      setSeats(newSeats);
      onSeatingConfigurationChange(newSeats, categories);
    } else {
      // Add new seat
      const category = categories.find(c => c.id === selectedCategory);
      if (!category) return;

      const newSeat: SeatData = {
        id: `seat_${Date.now()}_${Math.random()}`,
        x: percentageCoords.x,
        y: percentageCoords.y,
        seatNumber: `${category.name.charAt(0)}${seats.filter(s => s.category === selectedCategory).length + 1}`,
        category: selectedCategory,
        categoryColor: category.color,
        price: category.basePrice,
        isADA: selectedCategory === 'ada',
        status: 'available',
        section: getSectionForPosition(percentageCoords.x, percentageCoords.y),
        viewQuality: category.viewQuality
      };

      const newSeats = [...seats, newSeat];
      setSeats(newSeats);
      onSeatingConfigurationChange(newSeats, categories);
    }
  }, [tool, pan, zoom, seats, categories, selectedCategory, onSeatingConfigurationChange, imageDrawInfo]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [tool]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && tool === 'pan') {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging, tool, lastMousePos]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Helper function to determine section based on position
  const getSectionForPosition = (x: number, y: number): string => {
    if (y < 30) return 'Balcony';
    if (x < 20 || x > 80) return 'Side Sections';
    if (y > 70) return 'Dance Floor';
    return 'Main Floor';
  };

  // Event type recommendations
  const getEventTypeRecommendations = () => {
    switch (eventType) {
      case 'concert':
        return {
          title: 'Concert Venue Setup',
          suggestions: [
            'Place VIP seats closest to stage',
            'Create standing area near front',
            'Ensure ADA access to all sections',
            'Consider sight lines for tall audience members'
          ]
        };
      case 'theater':
        return {
          title: 'Theater Seating Layout',
          suggestions: [
            'Arrange seats in curved rows',
            'Premium seats in center orchestra',
            'Balcony seating for budget options',
            'Wide aisles for intermission movement'
          ]
        };
      case 'sports':
        return {
          title: 'Sports Venue Configuration',
          suggestions: [
            'Premium seats at midfield/center court',
            'Club level with amenities',
            'Family sections with wider spacing',
            'Standing room areas behind seats'
          ]
        };
      default:
        return {
          title: 'General Event Layout',
          suggestions: [
            'Organize seats by price categories',
            'Ensure clear sight lines',
            'Provide adequate ADA seating',
            'Consider flow for entry/exit'
          ]
        };
    }
  };

  const recommendations = getEventTypeRecommendations();

  // Statistics
  const stats = React.useMemo(() => {
    const totalSeats = seats.length;
    const totalCapacity = categories.reduce((sum, cat) => sum + cat.maxCapacity, 0);
    const avgPrice = seats.length > 0 ? seats.reduce((sum, seat) => sum + seat.price, 0) / seats.length : 0;
    const seatsByCategory = categories.map(cat => ({
      ...cat,
      count: seats.filter(s => s.category === cat.id).length,
      remaining: Math.max(0, cat.maxCapacity - seats.filter(s => s.category === cat.id).length)
    }));

    return { totalSeats, totalCapacity, avgPrice, seatsByCategory };
  }, [seats, categories]);

  // Effect to redraw canvas
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const clearAllSeats = () => {
    setSeats([]);
    onSeatingConfigurationChange([], categories);
  };

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="place" className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            Place Seats
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Venue Info
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Venue Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload venue layout image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {venueImageUrl && (
                  <div className="mt-4">
                    <img 
                      src={venueImageUrl} 
                      alt="Venue layout" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">{recommendations.title}</h4>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800">
                    {recommendations.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seat Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-600">
                          ${category.basePrice} • Max {category.maxCapacity} seats
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{category.viewQuality}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Seating Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalSeats}</div>
                  <div className="text-sm text-gray-600">Total Seats</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalCapacity}</div>
                  <div className="text-sm text-gray-600">Max Capacity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${Math.round(stats.avgPrice)}</div>
                  <div className="text-sm text-gray-600">Avg Price</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round((stats.totalSeats / stats.totalCapacity) * 100)}%</div>
                  <div className="text-sm text-gray-600">Capacity Used</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                {stats.seatsByCategory.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {cat.count} / {cat.maxCapacity}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Place Seats Tab */}
        <TabsContent value="place" className="space-y-4">
          {venueImageUrl ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Controls Panel */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={tool === 'pan' ? 'default' : 'outline'}
                        onClick={() => setTool('pan')}
                        className="flex items-center gap-1"
                      >
                        <Move className="h-3 w-3" />
                        Pan
                      </Button>
                      <Button
                        size="sm"
                        variant={tool === 'place' ? 'default' : 'outline'}
                        onClick={() => setTool('place')}
                        className="flex items-center gap-1"
                      >
                        <MousePointer className="h-3 w-3" />
                        Place
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-xs">Seat Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-xs">View Controls</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                        >
                          <ZoomOut className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetView}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={clearAllSeats}
                      className="w-full flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear All
                    </Button>
                  </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Section</Label>
                      <Select value={filterSection} onValueChange={setFilterSection}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section} value={section}>
                              {section === 'all' ? 'All Sections' : section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Price Range</Label>
                      <Slider
                        value={filterPriceRange}
                        onValueChange={(value) => setFilterPriceRange(value as [number, number])}
                        max={500}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>${filterPriceRange[0]}</span>
                        <span>${filterPriceRange[1]}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">View Quality</Label>
                      <Select value={filterViewQuality} onValueChange={setFilterViewQuality}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Qualities</SelectItem>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Canvas */}
              <div className="lg:col-span-3">
                <Card>
                  <CardContent className="p-4">
                    <div ref={containerRef} className="relative w-full h-96 overflow-hidden rounded-lg border">
                      <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        className="w-full h-full cursor-pointer"
                        onClick={handleCanvasClick}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                      />
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <span>
                        {tool === 'place' ? 'Click to place seats' : 'Drag to pan around'}
                      </span>
                      <span>
                        Zoom: {Math.round(zoom * 100)}% | Seats: {filteredSeats.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">
                  Please upload a venue layout first
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Venue Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Venue Information</CardTitle>
            </CardHeader>
            <CardContent>
              {venueInfo ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Name</Label>
                        <p>{venueInfo.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Address</Label>
                        <p>{venueInfo.address}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Capacity</Label>
                        <p>{venueInfo.capacity} people</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Utensils className="h-4 w-4" />
                      Amenities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {venueInfo.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary">{amenity}</Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Accessibility
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {venueInfo.accessibility.map((feature, index) => (
                        <Badge key={index} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Parking
                      </h4>
                      {venueInfo.parking.available ? (
                        <div className="space-y-1 text-sm">
                          <p>✓ Parking available</p>
                          {venueInfo.parking.capacity && (
                            <p>Capacity: {venueInfo.parking.capacity} spaces</p>
                          )}
                          {venueInfo.parking.cost && (
                            <p>Cost: {venueInfo.parking.cost}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No parking available</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Bus className="h-4 w-4" />
                        Public Transit
                      </h4>
                      {venueInfo.transit.nearby ? (
                        <div className="space-y-1 text-sm">
                          <p>✓ Transit accessible</p>
                          {venueInfo.transit.lines && (
                            <p>Lines: {venueInfo.transit.lines.join(', ')}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No nearby transit</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No venue information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}