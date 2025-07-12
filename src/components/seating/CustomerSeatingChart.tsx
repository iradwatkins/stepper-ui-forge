import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ShoppingCart, 
  Clock,
  Users,
  DollarSign,
  UserCheck,
  MapPin,
  Eye,
  Star,
  AlertCircle,
  Move
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import { SeatData, PriceCategory } from '@/types/seating';

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
  eventType = 'simple',
  eventId,
  enableHoldTimer = true,
  holdDurationMinutes = 15,
  onHoldExpire
}: CustomerSeatingChartProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    seat: SeatData;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'price' | 'section' | 'availability'>('price');

  // Canvas and zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Image state
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Hold timer state
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [holdActive, setHoldActive] = useState(false);

  // Load image
  useEffect(() => {
    if (!venueImageUrl) {
      setImageLoading(false);
      setImageError(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Customer chart image loaded successfully:', { width: img.width, height: img.height });
      setLoadedImage(img);
      setImageLoading(false);
      setImageError(false);
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load customer chart image:', venueImageUrl);
      setImageLoading(false);
      setImageError(true);
      setLoadedImage(null);
    };
    
    img.src = venueImageUrl;
  }, [venueImageUrl]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Hold timer management
  useEffect(() => {
    if (selectedSeats.length > 0 && enableHoldTimer && !holdActive) {
      setHoldActive(true);
      setHoldTimer(holdDurationMinutes * 60);
    } else if (selectedSeats.length === 0 && holdActive) {
      setHoldActive(false);
      setHoldTimer(0);
    }
  }, [selectedSeats.length, enableHoldTimer, holdDurationMinutes, holdActive]);

  useEffect(() => {
    if (holdActive && holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            setHoldActive(false);
            onHoldExpire?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [holdActive, holdTimer, onHoldExpire]);

  // Memoized calculations
  const sections = React.useMemo(() => {
    const sectionSet = new Set(seats.map(seat => seat.section).filter(Boolean));
    return ['all', ...Array.from(sectionSet)];
  }, [seats]);

  const filteredSeats = React.useMemo(() => {
    return seats.filter(seat => {
      if (filterSection !== 'all' && seat.section !== filterSection) return false;
      if (seat.price < filterPriceRange[0] || seat.price > filterPriceRange[1]) return false;
      return true;
    });
  }, [seats, filterSection, filterPriceRange]);

  const sortedSeats = React.useMemo(() => {
    return [...filteredSeats].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'section':
          return (a.section || '').localeCompare(b.section || '');
        case 'availability':
          const statusOrder = { available: 0, held: 1, reserved: 2, sold: 3, selected: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });
  }, [filteredSeats, sortBy]);

  const statistics = React.useMemo(() => {
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
    if (!canvas || !ctx || !loadedImage) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();
    
    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Calculate image draw info (fit to canvas while preserving aspect ratio)
    const imageAspectRatio = loadedImage.width / loadedImage.height;
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let drawWidth: number;
    let drawHeight: number;
    let drawX: number;
    let drawY: number;
    
    if (imageAspectRatio > canvasAspectRatio) {
      // Image is wider - fit to width
      drawWidth = canvas.width;
      drawHeight = canvas.width / imageAspectRatio;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    } else {
      // Image is taller - fit to height
      drawHeight = canvas.height;
      drawWidth = canvas.height * imageAspectRatio;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    }
    
    // Draw background image
    ctx.drawImage(loadedImage, drawX, drawY, drawWidth, drawHeight);
    
    // Group seats by table for table-based rendering
    const tables = new Map();
    sortedSeats.forEach((seat) => {
      if (!seat.tableId) return;
      if (!tables.has(seat.tableId)) {
        tables.set(seat.tableId, {
          id: seat.tableId,
          name: seat.tableName,
          type: seat.tableType,
          seats: [],
          centerX: 0,
          centerY: 0
        });
      }
      tables.get(seat.tableId).seats.push(seat);
    });

    // Draw tables and chairs
    tables.forEach((table) => {
      if (table.seats.length === 0) return;

      // Calculate table center from first chair position (table center was offset for chair placement)
      const firstSeat = table.seats[0];
      const tableCenterX = drawX + (firstSeat.x / 100) * drawWidth;
      const tableCenterY = drawY + (firstSeat.y / 100) * drawHeight;
      
      // Draw table base
      const tableRadius = 25;
      ctx.beginPath();
      ctx.arc(tableCenterX, tableCenterY, tableRadius, 0, 2 * Math.PI);
      
      // Table color based on type
      let tableColor = '#8B5CF6'; // Regular table (purple)
      if (table.type === 'vip') {
        tableColor = '#FFD700'; // Gold for VIP
      } else if (table.type === 'accessible') {
        tableColor = '#4169E1'; // Blue for accessible
      }
      
      ctx.fillStyle = tableColor;
      ctx.fill();
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw table label
      ctx.fillStyle = '#1F2937';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(table.name, tableCenterX, tableCenterY);

      // Draw chairs around table
      table.seats.forEach((seat) => {
        const chairX = drawX + (seat.x / 100) * drawWidth;
        const chairY = drawY + (seat.y / 100) * drawHeight;
        
        const chairWidth = 14;
        const chairHeight = 12;
        const isSelected = selectedSeats.includes(seat.id);
        const isHovered = hoveredSeat === seat.id;

        // Draw chair
        ctx.beginPath();
        ctx.roundRect(
          chairX - chairWidth / 2, 
          chairY - chairHeight / 2, 
          chairWidth, 
          chairHeight, 
          3
        );

        // Chair color based on status and selection
        if (isSelected) {
          ctx.fillStyle = '#22C55E'; // Green when selected
        } else if (seat.status === 'sold') {
          ctx.fillStyle = '#EF4444'; // Red when sold
        } else if (seat.status === 'held') {
          ctx.fillStyle = '#F59E0B'; // Yellow when held
        } else {
          ctx.fillStyle = '#F3F4F6'; // Light gray when available
        }
        
        ctx.fill();
        
        // Chair border
        ctx.strokeStyle = isHovered ? '#1F2937' : '#9CA3AF';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Add accessibility icon for accessible tables
        if (table.type === 'accessible') {
          ctx.fillStyle = '#1F2937';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('♿', chairX, chairY);
        }

        // Add crown for VIP tables
        if (table.type === 'vip') {
          ctx.fillStyle = '#FFD700';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', chairX, chairY - 18);
        }
      });
    });

    // Restore context
    ctx.restore();
  }, [loadedImage, sortedSeats, selectedSeats, hoveredSeat, zoom, pan]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvas event handlers
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Apply inverse transform
    const transformedX = (clickX - pan.x) / zoom;
    const transformedY = (clickY - pan.y) / zoom;
    
    // Calculate image draw info (same as in drawCanvas)
    const imageAspectRatio = loadedImage.width / loadedImage.height;
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let drawWidth: number;
    let drawHeight: number;
    let drawX: number;
    let drawY: number;
    
    if (imageAspectRatio > canvasAspectRatio) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imageAspectRatio;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imageAspectRatio;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    }
    
    // Check if click is within image bounds
    if (transformedX < drawX || transformedX > drawX + drawWidth ||
        transformedY < drawY || transformedY > drawY + drawHeight) {
      return;
    }
    
    // Convert to percentage coordinates
    const percentageX = ((transformedX - drawX) / drawWidth) * 100;
    const percentageY = ((transformedY - drawY) / drawHeight) * 100;
    
    // Find clicked seat
    const clickedSeat = sortedSeats.find(seat => {
      const dx = Math.abs(seat.x - percentageX);
      const dy = Math.abs(seat.y - percentageY);
      return dx < 3 && dy < 3; // 3% tolerance
    });

    if (clickedSeat && clickedSeat.status === 'available') {
      console.log('🪑 Customer clicked seat:', clickedSeat.seatNumber, clickedSeat.id);
      
      const isSelected = selectedSeats.includes(clickedSeat.id);

      if (isSelected) {
        // Deselect seat
        const newSelection = selectedSeats.filter(id => id !== clickedSeat.id);
        onSeatSelection?.(newSelection);
      } else if (selectedSeats.length < maxSelectableSeats) {
        // Select seat
        const newSelection = [...selectedSeats, clickedSeat.id];
        onSeatSelection?.(newSelection);
      }
    }
  }, [disabled, isDragging, selectedSeats, maxSelectableSeats, onSeatSelection, loadedImage, pan, zoom, sortedSeats]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setPan(prev => ({ 
        x: Math.min(100, Math.max(-200, prev.x + deltaX)), 
        y: Math.min(100, Math.max(-200, prev.y + deltaY))
      }));
      setLastMousePos({ x: event.clientX, y: event.clientY });
    } else {
      // Handle seat hover
      const canvas = canvasRef.current;
      if (!canvas || !loadedImage) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      const transformedX = (mouseX - pan.x) / zoom;
      const transformedY = (mouseY - pan.y) / zoom;
      
      // Calculate image area
      const imageAspectRatio = loadedImage.width / loadedImage.height;
      const canvasAspectRatio = canvas.width / canvas.height;
      
      let drawWidth: number;
      let drawHeight: number;
      let drawX: number;
      let drawY: number;
      
      if (imageAspectRatio > canvasAspectRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageAspectRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imageAspectRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }
      
      if (transformedX >= drawX && transformedX <= drawX + drawWidth &&
          transformedY >= drawY && transformedY <= drawY + drawHeight) {
        
        const percentageX = ((transformedX - drawX) / drawWidth) * 100;
        const percentageY = ((transformedY - drawY) / drawHeight) * 100;
        
        const hoveredSeat = sortedSeats.find(seat => {
          const dx = Math.abs(seat.x - percentageX);
          const dy = Math.abs(seat.y - percentageY);
          return dx < 3 && dy < 3;
        });
        
        setHoveredSeat(hoveredSeat?.id || null);
        
        if (hoveredSeat) {
          setTooltipData({
            seat: hoveredSeat,
            x: mouseX,
            y: mouseY,
            visible: true
          });
        } else {
          setTooltipData(null);
        }
      } else {
        setHoveredSeat(null);
        setTooltipData(null);
      }
    }
  }, [isDragging, lastMousePos, pan, zoom, loadedImage, sortedSeats]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom and pan controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={zoomOut} disabled={disabled}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button size="sm" variant="outline" onClick={zoomIn} disabled={disabled}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetView} disabled={disabled}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{statistics.selected} / {maxSelectableSeats} selected</span>
          </div>
        </div>

        {showPurchaseButton && statistics.selected > 0 && (
          <Button 
            onClick={onPurchaseClick}
            disabled={disabled || statistics.selected === 0}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Purchase ${statistics.totalPrice}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters and Legend */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
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
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-green-600 border border-gray-300"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-blue-600 border border-gray-300"></div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-red-600 border border-gray-300"></div>
                    <span>Sold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-yellow-500 border border-gray-300"></div>
                    <span>Reserved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-purple-600 border border-gray-300"></div>
                    <span>Held</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Available</span>
                  <span>{statistics.available} / {statistics.total}</span>
                </div>
                <Progress value={(statistics.available / statistics.total) * 100} className="h-2" />
              </div>

              {statistics.selected > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Selected Seats</span>
                      <span>{statistics.selected}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${statistics.totalPrice}</span>
                    </div>
                  </div>
                  
                  {/* Hold Timer */}
                  {enableHoldTimer && holdActive && holdTimer > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Seats held for</div>
                          <div className={`text-lg font-bold ${holdTimer < 60 ? 'text-red-500' : 'text-blue-600'}`}>
                            {formatTime(holdTimer)}
                          </div>
                          <Progress 
                            value={(holdTimer / (holdDurationMinutes * 60)) * 100} 
                            className="h-2 mt-1"
                          />
                          {holdTimer < 60 && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-red-700 text-xs">
                                Hurry! Seats expire in {formatTime(holdTimer)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div 
                ref={containerRef} 
                className="relative w-full h-96 lg:h-[500px] overflow-hidden rounded-lg border bg-gray-50"
              >
                <canvas
                  ref={canvasRef}
                  className={`w-full h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={handleCanvasClick}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    setHoveredSeat(null);
                    setTooltipData(null);
                  }}
                />
                
                {/* Tooltip */}
                {tooltipData && tooltipData.visible && (
                  <div 
                    className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none"
                    style={{
                      left: Math.min(tooltipData.x + 10, containerRef.current?.clientWidth || 800 - 250),
                      top: Math.max(tooltipData.y - 80, 10),
                      transform: tooltipData.x > 600 ? 'translateX(-100%)' : 'translateX(0)'
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-4 rounded-sm border border-gray-300"
                            style={{ backgroundColor: tooltipData.seat.categoryColor }}
                          />
                          <span className="font-medium text-sm">
                            Seat {tooltipData.seat.seatNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {tooltipData.seat.isPremium && <span className="text-yellow-500 text-sm">★</span>}
                          {tooltipData.seat.isADA && <span className="text-blue-600 text-sm">♿</span>}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        {tooltipData.seat.section && (
                          <div>Section: <span className="font-medium">{tooltipData.seat.section}</span></div>
                        )}
                        {tooltipData.seat.row && (
                          <div>Row: <span className="font-medium">{tooltipData.seat.row}</span></div>
                        )}
                      </div>
                      
                      <div className="border-t pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Price:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${tooltipData.seat.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Loading/Error States */}
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading venue...</p>
                    </div>
                  </div>
                )}
                
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="mt-2 text-sm text-gray-600">Failed to load venue image</p>
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

      {/* Selected Seats Summary */}
      {statistics.selected > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Selected Seats ({statistics.selected})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-24">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedSeats.map(seatId => {
                  const seat = seats.find(s => s.id === seatId);
                  if (!seat) return null;
                  
                  return (
                    <div key={seatId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: seat.categoryColor }}
                        />
                        <span>{seat.seatNumber}</span>
                        {seat.section && <Badge variant="outline" className="text-xs">{seat.section}</Badge>}
                      </div>
                      <span className="font-medium">${seat.price}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}