import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';

// Types
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
  holdExpiry?: Date;
  amenities?: string[];
  viewQuality?: 'excellent' | 'good' | 'fair' | 'limited';
  tableId?: string;
  groupSize?: number;
}

export interface PriceCategory {
  id: string;
  name: string;
  color: string;
  basePrice: number;
  description?: string;
}

interface InteractiveSeatingChartProps {
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
}

export default function InteractiveSeatingChart({
  venueImageUrl,
  seats,
  priceCategories,
  selectedSeats = [],
  onSeatSelection,
  onPurchaseClick,
  maxSelectableSeats = 10,
  showPurchaseButton = true,
  disabled = false,
  className = ''
}: InteractiveSeatingChartProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [dragStartPan, setDragStartPan] = useState({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'price' | 'section' | 'availability'>('price');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Memoized calculations
  const sections = useMemo(() => {
    const sectionSet = new Set(seats.map(seat => seat.section).filter(Boolean));
    return ['all', ...Array.from(sectionSet)];
  }, [seats]);

  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      if (filterSection !== 'all' && seat.section !== filterSection) return false;
      if (seat.price < filterPriceRange[0] || seat.price > filterPriceRange[1]) return false;
      return true;
    });
  }, [seats, filterSection, filterPriceRange]);

  const sortedSeats = useMemo(() => {
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

  const statistics = useMemo(() => {
    const total = seats.length;
    const available = seats.filter(s => s.status === 'available').length;
    const selected = selectedSeats.length;
    const sold = seats.filter(s => s.status === 'sold').length;
    const avgPrice = selected > 0 
      ? seats.filter(s => selectedSeats.includes(s.id)).reduce((sum, s) => sum + s.price, 0) / selected
      : 0;
    const totalPrice = seats.filter(s => selectedSeats.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

    return { total, available, selected, sold, avgPrice, totalPrice };
  }, [seats, selectedSeats]);

  // Load and cache venue image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.src = venueImageUrl;
  }, [venueImageUrl]);

  // Canvas drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw seats
    sortedSeats.forEach(seat => {
      if (!seat) return;

      const x = (seat.x / 100) * canvas.width;
      const y = (seat.y / 100) * canvas.height;
      const radius = 10;
      const isSelected = selectedSeats.includes(seat.id);
      const isHovered = hoveredSeat === seat.id;

      // Seat circle with status-based styling
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      // Fill color based on status
      switch (seat.status) {
        case 'available':
          ctx.fillStyle = isSelected ? '#22C55E' : seat.categoryColor;
          break;
        case 'selected':
          ctx.fillStyle = '#22C55E';
          break;
        case 'sold':
          ctx.fillStyle = '#DC2626';
          break;
        case 'reserved':
          ctx.fillStyle = '#F59E0B';
          break;
        case 'held':
          ctx.fillStyle = '#8B5CF6';
          break;
        default:
          ctx.fillStyle = seat.categoryColor;
      }
      ctx.fill();

      // Seat border
      ctx.strokeStyle = isSelected ? '#000' : isHovered ? '#333' : '#fff';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.stroke();

      // Hover glow effect
      if (isHovered && seat.status === 'available') {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // ADA indicator
      if (seat.isADA) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('♿', x, y + 4);
      }

      // Hold timer indicator
      if (seat.status === 'held' && seat.holdExpiry) {
        const timeLeft = seat.holdExpiry.getTime() - Date.now();
        if (timeLeft > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = '8px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('⏱', x, y - radius - 8);
        }
      }

      // Seat number (for hovered or selected seats)
      if ((isHovered || isSelected) && seat.seatNumber) {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(seat.seatNumber, x, y - radius - 12);
      }

      // Price display for hovered seats
      if (isHovered && seat.status === 'available') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 20, y + radius + 5, 40, 16);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`$${seat.price}`, x, y + radius + 15);
      }
    });

    // Restore context
    ctx.restore();
  }, [sortedSeats, selectedSeats, hoveredSeat, zoom, pan]);

  // Animation loop for smooth updates
  useEffect(() => {
    const animate = () => {
      drawCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawCanvas]);

  // Canvas event handlers
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left - pan.x) / zoom);
    const y = ((event.clientY - rect.top - pan.y) / zoom);
    
    return { x, y };
  }, [pan, zoom]);

  const findSeatAtPosition = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return sortedSeats.find(seat => {
      const seatX = (seat.x / 100) * canvas.width;
      const seatY = (seat.y / 100) * canvas.height;
      const distance = Math.sqrt((x - seatX) ** 2 + (y - seatY) ** 2);
      return distance <= 15; // 15px click tolerance
    });
  }, [sortedSeats]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || isDragging) return;

    const { x, y } = getCanvasCoordinates(event);
    const clickedSeat = findSeatAtPosition(x, y);

    if (clickedSeat && clickedSeat.status === 'available') {
      if (selectedSeats.includes(clickedSeat.id)) {
        // Deselect seat
        const newSelection = selectedSeats.filter(id => id !== clickedSeat.id);
        onSeatSelection?.(newSelection);
      } else if (selectedSeats.length < maxSelectableSeats) {
        // Select seat
        const newSelection = [...selectedSeats, clickedSeat.id];
        onSeatSelection?.(newSelection);
      }
    }
  }, [disabled, isDragging, getCanvasCoordinates, findSeatAtPosition, selectedSeats, maxSelectableSeats, onSeatSelection]);

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
      const { x, y } = getCanvasCoordinates(event);
      const hoveredSeat = findSeatAtPosition(x, y);
      setHoveredSeat(hoveredSeat?.id || null);
    }
  }, [isDragging, lastMousePos, getCanvasCoordinates, findSeatAtPosition]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
    setDragStartPan(pan);
  }, [pan]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Only trigger click if we didn't drag much
    const dragDistance = Math.sqrt(
      (event.clientX - lastMousePos.x) ** 2 + (event.clientY - lastMousePos.y) ** 2
    );
    
    if (dragDistance < 5) {
      handleCanvasClick(event);
    }
    
    setIsDragging(false);
  }, [lastMousePos, handleCanvasClick]);

  // Zoom and pan controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Touch support for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      setIsDragging(true);
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
      setDragStartPan(pan);
    }
  }, [pan]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (event.touches.length === 1 && isDragging) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - lastMousePos.x;
      const deltaY = touch.clientY - lastMousePos.y;
      setPan(prev => ({ 
        x: Math.min(100, Math.max(-200, prev.x + deltaX)), 
        y: Math.min(100, Math.max(-200, prev.y + deltaY))
      }));
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
    }
  }, [isDragging, lastMousePos]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const dragDistance = Math.sqrt(
        (touch.clientX - lastMousePos.x) ** 2 + (touch.clientY - lastMousePos.y) ** 2
      );
      
      if (dragDistance < 10) {
        // Simulate click for tap
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
          } as React.MouseEvent<HTMLCanvasElement>;
          handleCanvasClick(fakeEvent);
        }
      }
    }
    setIsDragging(false);
  }, [lastMousePos, handleCanvasClick]);

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={zoomOut}
              disabled={disabled}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={zoomIn}
              disabled={disabled}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetView}
              disabled={disabled}
            >
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

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {priceCategories.map((category) => (
                <div key={category.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-xs">{category.name}</span>
                  <span className="text-xs text-gray-600 ml-auto">${category.basePrice}</span>
                </div>
              ))}
              
              <Separator className="my-2" />
              
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600" />
                  <span>Sold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span>Reserved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-600" />
                  <span>Held</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-600" />
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>ADA Accessible</span>
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
                    <div className="flex justify-between">
                      <span>Avg Price</span>
                      <span>${Math.round(statistics.avgPrice)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${statistics.totalPrice}</span>
                    </div>
                  </div>
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
                  width={800}
                  height={600}
                  className={`w-full h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    setHoveredSeat(null);
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
                
                {/* Loading overlay */}
                {!imageRef.current && (
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