import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ShoppingCart, 
  Clock,
  Users,
  DollarSign,
  MapPin,
  AlertCircle,
  Move,
  Eye,
  EyeOff,
  Star,
  Heart,
  Info
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { HoldTimer } from './HoldTimer';

import { SeatData, PriceCategory } from '@/types/seating';
import { 
  calculateImageDrawInfo, 
  clientToPercentageCoordinates, 
  percentageToCanvasCoordinates,
  getImageDimensions,
  type ImageDrawInfo,
  type Point,
  type ImageDimensions
} from '@/lib/utils/coordinateUtils';
import { SeatingService } from '@/lib/services/SeatingService';

interface CustomerSeatingChartProps {
  venueImageUrl: string;
  seats: SeatData[];
  priceCategories: PriceCategory[];
  selectedSeats?: string[];
  onSeatSelection?: (seatIds: string[]) => void;
  onPurchaseClick?: () => void;
  maxSelectableSeats?: number;
  showPurchaseButton?: boolean;
  disabled?: boolean;
  className?: string;
  eventType?: 'simple' | 'ticketed' | 'premium';
  eventId?: string;
  enableHoldTimer?: boolean;
  holdDurationMinutes?: number;
  onHoldExpire?: () => void;
}

export default function CustomerSeatingChart({
  venueImageUrl,
  seats,
  priceCategories,
  selectedSeats = [],
  onSeatSelection,
  onPurchaseClick,
  maxSelectableSeats = 10,
  showPurchaseButton = true,
  disabled = false,
  className = '',
  eventType = 'premium',
  eventId,
  enableHoldTimer = true,
  holdDurationMinutes = 15,
  onHoldExpire
}: CustomerSeatingChartProps) {
  // Canvas and image refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageDrawInfo, setImageDrawInfo] = useState<ImageDrawInfo | null>(null);
  
  // Filtering state
  const [filterSection, setFilterSection] = useState('all');
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'price' | 'section' | 'availability'>('price');
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string[]>([]);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState<SeatData | null>(null);

  // Hold timer state
  const [holdTimer, setHoldTimer] = useState(0);
  const [holdActive, setHoldActive] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);

  // Load image
  useEffect(() => {
    if (!venueImageUrl) {
      console.log('📸 No venue image URL provided');
      setImageLoading(false);
      setImageError(true);
      return;
    }

    setImageLoading(true);
    setImageError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Venue image loaded:', { width: img.width, height: img.height });
      imageRef.current = img;
      setImageLoading(false);
      setImageError(false);
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load venue image:', venueImageUrl);
      imageRef.current = null;
      setImageLoading(false);
      setImageError(true);
    };
    
    img.src = venueImageUrl;
  }, [venueImageUrl]);

  // Calculate image draw info when canvas or image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (canvas && image) {
      const drawInfo = calculateImageDrawInfo(
        image.width,
        image.height,
        canvas.width,
        canvas.height
      );
      setImageDrawInfo(drawInfo);
      console.log('📐 Image draw info calculated:', drawInfo);
    } else if (canvas && !image) {
      // No image - use full canvas
      setImageDrawInfo({
        drawX: 0,
        drawY: 0,
        drawWidth: canvas.width,
        drawHeight: canvas.height,
        scaleX: 1,
        scaleY: 1
      });
      console.log('📐 No image - using full canvas dimensions');
    }
  }, [canvasRef.current?.width, canvasRef.current?.height]);

  // Canvas setup and resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log('📏 Canvas resized:', { width: rect.width, height: rect.height });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Memoized calculations
  const sections = useMemo(() => {
    const sectionSet = new Set(seats.map(seat => seat.section).filter(Boolean));
    return ['all', ...Array.from(sectionSet)];
  }, [seats]);

  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      if (filterSection !== 'all' && seat.section !== filterSection) return false;
      if (seat.price < filterPriceRange[0] || seat.price > filterPriceRange[1]) return false;
      if (selectedPriceRange.length > 0) {
        const categoryMatch = priceCategories.find(cat => cat.basePrice === seat.price);
        if (!categoryMatch || !selectedPriceRange.includes(categoryMatch.id)) return false;
      }
      return true;
    });
  }, [seats, filterSection, filterPriceRange, selectedPriceRange, priceCategories]);

  const sortedSeats = useMemo(() => {
    return [...filteredSeats].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'section':
          return (a.section || '').localeCompare(b.section || '');
        case 'availability': {
          const statusOrder = { available: 0, held: 1, reserved: 2, sold: 3, selected: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        default:
          return 0;
      }
    });
  }, [filteredSeats, sortBy]);

  const statistics = useMemo(() => {
    const total = seats.length;
    const available = seats.filter(s => s.status === 'available').length;
    const selected = selectedSeats.length;
    const sold = seats.filter(s => s.status === 'sold').length;
    const totalPrice = seats.filter(s => selectedSeats.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

    return { total, available, selected, sold, totalPrice };
  }, [seats, selectedSeats]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = imageRef.current;
    
    if (!canvas || !ctx || !imageDrawInfo) {
      console.log('⚠️ Canvas, context, or imageDrawInfo not ready');
      return;
    }

    console.log('🎨 Drawing canvas with', sortedSeats.length, 'seats');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background image if available
    if (image) {
      ctx.drawImage(
        image,
        imageDrawInfo.drawX,
        imageDrawInfo.drawY,
        imageDrawInfo.drawWidth,
        imageDrawInfo.drawHeight
      );
      console.log('🖼️ Background image drawn');
    } else {
      // Draw light background when no image
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      console.log('🖼️ Light background drawn (no image)');
    }

    // Draw tables first (behind seats)
    const drawnTables = new Set<string>();
    sortedSeats.forEach(seat => {
      if (!seat.tableId || drawnTables.has(seat.tableId)) return;
      
      // Get all seats for this table
      const tableSeats = sortedSeats.filter(s => s.tableId === seat.tableId);
      if (tableSeats.length === 0) return;
      
      // Calculate table center based on seat positions
      const centerX = tableSeats.reduce((sum, s) => sum + s.x, 0) / tableSeats.length;
      const centerY = tableSeats.reduce((sum, s) => sum + s.y, 0) / tableSeats.length;
      
      const centerCoords = percentageToCanvasCoordinates(
        centerX,
        centerY,
        imageDrawInfo
      );
      
      const tableRadius = 25 / zoom;
      
      // Draw table based on type
      ctx.beginPath();
      if (seat.tableType === 'round') {
        ctx.arc(centerCoords.x, centerCoords.y, tableRadius, 0, 2 * Math.PI);
      } else if (seat.tableType === 'square') {
        ctx.rect(
          centerCoords.x - tableRadius,
          centerCoords.y - tableRadius,
          tableRadius * 2,
          tableRadius * 2
        );
      }
      
      // Table styling
      ctx.fillStyle = seat.isPremium ? 'rgba(245, 158, 11, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      ctx.fill();
      ctx.strokeStyle = seat.isPremium ? '#F59E0B' : '#6B7280';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      drawnTables.add(seat.tableId);
    });
    
    // Draw seats using percentage coordinates
    sortedSeats.forEach(seat => {
      if (!seat) return;

      // Convert percentage coordinates to canvas coordinates
      const canvasCoords = percentageToCanvasCoordinates(
        seat.x,
        seat.y,
        imageDrawInfo
      );
      
      const seatWidth = 20 / zoom; // Seat width
      const seatHeight = 16 / zoom; // Seat height  
      const cornerRadius = 4 / zoom; // Rounded corners
      const isSelected = selectedSeats.includes(seat.id);
      const isHovered = hoveredSeat === seat.id;

      // Draw seat with rounded rectangle
      ctx.beginPath();
      ctx.roundRect(
        canvasCoords.x - seatWidth / 2,
        canvasCoords.y - seatHeight / 2,
        seatWidth,
        seatHeight,
        cornerRadius
      );

      // Seat color based on status - bright colors for visibility
      if (isSelected) {
        ctx.fillStyle = '#2563EB'; // Bright blue when selected
      } else if (seat.status === 'sold') {
        ctx.fillStyle = '#DC2626'; // Red when sold
      } else if (seat.status === 'held') {
        ctx.fillStyle = '#F59E0B'; // Orange when held
      } else {
        ctx.fillStyle = '#16A34A'; // Bright green when available
      }
      
      ctx.fill();

      // Add border for visibility
      ctx.strokeStyle = isHovered ? '#FFFFFF' : '#000000';
      ctx.lineWidth = (isHovered ? 3 : 2) / zoom;
      ctx.stroke();

      // Seat number
      if (seat.seatNumber) {
        ctx.fillStyle = seat.status === 'sold' ? '#FFFFFF' : '#000000';
        ctx.font = `bold ${10 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seat.seatNumber, canvasCoords.x, canvasCoords.y);
      }

      // Premium indicator
      if (seat.isPremium) {
        ctx.fillStyle = '#FFD700';
        ctx.font = `${8 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('★', canvasCoords.x, canvasCoords.y - seatHeight / 2 - 6 / zoom);
      }
      
      // ADA indicator
      if (seat.isADA) {
        ctx.fillStyle = '#0066CC';
        ctx.font = `${8 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('♿', canvasCoords.x + seatWidth / 2 + 6 / zoom, canvasCoords.y - seatHeight / 2 + 2 / zoom);
      }
    });

    // Restore context
    ctx.restore();
    console.log('✅ Canvas drawing complete');
  }, [imageDrawInfo, sortedSeats, selectedSeats, hoveredSeat, zoom, pan]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Seat selection handler
  const handleSeatClick = useCallback(async (seat: SeatData) => {
    if (disabled || seat.status !== 'available') return;

    const isSelected = selectedSeats.includes(seat.id);
    let newSelection: string[];

    if (isSelected) {
      // Deselect seat
      newSelection = selectedSeats.filter(id => id !== seat.id);
    } else {
      // Select seat (respect max limit)
      if (selectedSeats.length >= maxSelectableSeats) {
        return; // Can't select more
      }
      newSelection = [...selectedSeats, seat.id];
      
      // Hold the seat if eventId is provided
      if (eventId && enableHoldTimer) {
        try {
          console.log('🔒 Holding seat:', seat.id);
          const seatingService = new SeatingService();
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await seatingService.holdSeats([seat.id], eventId, sessionId, {
            holdDurationMinutes
          });
        } catch (error) {
          console.error('Failed to hold seat:', error);
          // Continue with selection even if hold fails
        }
      }
    }

    onSeatSelection?.(newSelection);
  }, [selectedSeats, onSeatSelection, disabled, maxSelectableSeats, eventId, enableHoldTimer, holdDurationMinutes]);

  // Canvas event handlers
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas || !imageDrawInfo) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Convert to percentage coordinates
    const percentageCoords = clientToPercentageCoordinates(
      clickX,
      clickY,
      canvas,
      imageDrawInfo,
      { pan, zoom }
    );

    // Find clicked seat with increased tolerance for better usability
    console.log('🖱️ Click detected at percentage coords:', percentageCoords);
    const clickedSeat = sortedSeats.find(seat => {
      const dx = Math.abs(seat.x - percentageCoords.x);
      const dy = Math.abs(seat.y - percentageCoords.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log(`Checking seat ${seat.seatNumber}: position(${seat.x}, ${seat.y}), distance: ${distance.toFixed(2)}`);
      return dx < 5 && dy < 5; // Increased tolerance to 5% for easier clicking
    });

    if (clickedSeat) {
      console.log('✅ Seat clicked:', clickedSeat.seatNumber, clickedSeat.id);
      handleSeatClick(clickedSeat);
    } else {
      console.log('❌ No seat found at click location');
    }
  }, [imageDrawInfo, sortedSeats, handleSeatClick, pan, zoom, isDragging, disabled]);

  // Mouse move handler for hover and dragging
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setPan(prev => ({ 
        x: Math.min(100, Math.max(-200, prev.x + deltaX)), 
        y: Math.min(100, Math.max(-200, prev.y + deltaY))
      }));
      setLastMousePos({ x: event.clientX, y: event.clientY });
    } else if (!disabled && imageDrawInfo) {
      // Handle seat hover
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Convert to percentage coordinates
      const percentageCoords = clientToPercentageCoordinates(
        mouseX,
        mouseY,
        canvas,
        imageDrawInfo,
        { pan, zoom }
      );

      // Find hovered seat
      const hoveredSeatData = sortedSeats.find(seat => {
        const dx = Math.abs(seat.x - percentageCoords.x);
        const dy = Math.abs(seat.y - percentageCoords.y);
        return dx < 3 && dy < 3; // 3% tolerance
      });

      setHoveredSeat(hoveredSeatData?.id || null);
      if (hoveredSeatData) {
        handleSeatHover(hoveredSeatData);
      } else {
        setSelectedSeatInfo(null);
      }
    }
  }, [isDragging, lastMousePos, imageDrawInfo, sortedSeats, pan, zoom, disabled, handleSeatHover]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [disabled]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Hold timer management
  useEffect(() => {
    if (selectedSeats.length > 0 && enableHoldTimer && !holdActive) {
      setHoldActive(true);
      setHoldTimer(holdDurationMinutes * 60);
      const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
      setHoldExpiresAt(expiresAt);
    } else if (selectedSeats.length === 0 && holdActive) {
      setHoldActive(false);
      setHoldTimer(0);
      setHoldExpiresAt(null);
    }
  }, [selectedSeats.length, enableHoldTimer, holdDurationMinutes, holdActive]);

  useEffect(() => {
    if (holdActive && holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            setHoldActive(false);
            setHoldExpiresAt(null);
            onHoldExpire?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [holdActive, holdTimer, onHoldExpire]);

  // Handle seat hover
  const handleSeatHover = useCallback((seat: SeatData) => {
    setSelectedSeatInfo(seat);
  }, []);

  const getRecommendedSeats = () => {
    return sortedSeats.filter(seat => 
      seat.status === 'available' && 
      seat.isPremium
    ).slice(0, 6);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.2));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.2));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Utility functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-surface-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-text-primary flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-brand-primary" />
                Select Your Seats
              </CardTitle>
              <p className="text-text-secondary mt-1">Premium Seating Experience</p>
            </div>
            
            {/* Hold Timer */}
            {selectedSeats.length > 0 && enableHoldTimer && holdExpiresAt && (
              <div className="text-center">
                <HoldTimer 
                  expiresAt={holdExpiresAt}
                  onExpired={() => {
                    setHoldActive(false);
                    onHoldExpire?.();
                  }}
                  variant="prominent"
                  size="md"
                />
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar - Statistics and Filters */}
        <div className="lg:col-span-1 space-y-4">
          {/* Statistics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Seating Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{statistics.available}</div>
                <div className="text-xs text-green-700">Available</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">{statistics.selected}</div>
                <div className="text-xs text-blue-700">Selected</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-lg font-bold text-red-600">{statistics.sold}</div>
                <div className="text-xs text-red-700">Sold</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-600">{statistics.total}</div>
                <div className="text-xs text-gray-700">Total</div>
              </div>
            </div>

            {statistics.selected > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Total Price</span>
                  <span className="text-lg font-bold text-blue-600">${statistics.totalPrice}</span>
                </div>
                
                {enableHoldTimer && holdActive && holdExpiresAt && (
                  <div className="mt-3">
                    <HoldTimer 
                      expiresAt={holdExpiresAt}
                      onExpired={() => {
                        setHoldActive(false);
                        onHoldExpire?.();
                      }}
                      variant="badge"
                      size="sm"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {getRecommendedSeats().length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Star className="w-4 h-4 mr-2 text-yellow-500" />
                Recommended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getRecommendedSeats().slice(0, 3).map(seat => (
                  <div 
                    key={seat.id}
                    className="p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleSeatClick(seat)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{seat.seatNumber}</div>
                        <div className="text-xs text-gray-600">${seat.price}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Premium
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">View Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetView}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-600">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Section</label>
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
              <label className="text-xs font-medium">Price Range</label>
              <Slider
                value={filterPriceRange}
                onValueChange={(value) => setFilterPriceRange(value as [number, number])}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>${filterPriceRange[0]}</span>
                <span>${filterPriceRange[1]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="availability">Availability</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seat Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Seat Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Categories */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Categories</p>
              {priceCategories.map((category) => (
                <div key={category.id} className="flex items-center gap-2">
                  <div 
                    className="w-5 h-4 rounded-sm border border-gray-300 relative"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.isPremium && (
                      <span className="absolute top-0 left-0 text-yellow-500 text-xs leading-none">★</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium">{category.name}</span>
                    <span className="text-xs text-gray-600 ml-2">${category.basePrice}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator className="my-2" />
            
            {/* Status Legend */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Seat Status</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 rounded-sm bg-green-500 border border-black"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 rounded-sm bg-blue-500 border border-black"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 rounded-sm bg-red-600 border border-black"></div>
                  <span>Sold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 rounded-sm bg-orange-500 border border-black"></div>
                  <span>Held</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card className="bg-surface-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-medium">Interactive Seating Chart</h3>
                  <Badge variant="secondary">{filteredSeats.filter(s => s.status === 'available').length} available</Badge>
                </div>
                
                {/* Enhanced Controls */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetView}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPriceFilter(!showPriceFilter)}
                  >
                    {showPriceFilter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Price Filter */}
              {showPriceFilter && (
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <span className="text-sm font-medium">Filter by price:</span>
                  {priceCategories.map(category => (
                    <Button
                      key={category.id}
                      variant={selectedPriceRange.includes(category.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (selectedPriceRange.includes(category.id)) {
                          setSelectedPriceRange(prev => prev.filter(id => id !== category.id));
                        } else {
                          setSelectedPriceRange(prev => [...prev, category.id]);
                        }
                      }}
                      className="h-8"
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name} (${category.basePrice})
                    </Button>
                  ))}
                  {selectedPriceRange.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPriceRange([])}
                      className="h-8"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4">
            <div 
              ref={containerRef} 
              className="relative w-full h-96 lg:h-[500px] overflow-hidden rounded-lg border bg-gray-50"
            >
              <canvas
                ref={canvasRef}
                className={`w-full h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ position: 'absolute', top: 0, left: 0 }}
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => {
                  setIsDragging(false);
                  setHoveredSeat(null);
                }}
              />
              
              {/* Seat hover info */}
              {selectedSeatInfo && (
                <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-20">
                  <div className="font-medium">{selectedSeatInfo.seatNumber}</div>
                  <div className="text-sm text-gray-600">
                    {selectedSeatInfo.section && `${selectedSeatInfo.section} • `}
                    ${selectedSeatInfo.price}
                  </div>
                  {selectedSeatInfo.isPremium && (
                    <div className="text-xs text-green-600 mt-1">
                      Premium • VIP Experience
                    </div>
                  )}
                  {selectedSeatInfo.isADA && (
                    <div className="text-xs text-blue-600 mt-1">
                      Wheelchair Accessible
                    </div>
                  )}
                </div>
              )}

              {/* Loading State */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading venue...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
              <span>
                {disabled ? 'Preview mode' : 'Click seats to select • Drag to pan'}
              </span>
              <span>
                Showing {filteredSeats.length} of {seats.length} seats
              </span>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Purchase Button */}
      {showPurchaseButton && statistics.selected > 0 && onPurchaseClick && (
        <Card>
          <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">
                      {statistics.selected} seat{statistics.selected !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-lg">${statistics.totalPrice}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={onPurchaseClick}
                  disabled={disabled || statistics.selected === 0}
                  size="lg"
                  className="px-8"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}