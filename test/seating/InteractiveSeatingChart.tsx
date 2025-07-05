import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Users, 
  DollarSign,
  Accessibility,
  Clock,
  Info,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SeatData {
  id: string;
  seatNumber: string;
  row?: string;
  section?: string;
  x: number;
  y: number;
  price: number;
  category: string;
  categoryColor: string;
  isADA: boolean;
  status: 'available' | 'selected' | 'sold' | 'reserved' | 'held';
  holdExpiry?: Date;
}

interface PriceCategory {
  id: string;
  name: string;
  price: number;
  color: string;
  description?: string;
}

interface InteractiveSeatingChartProps {
  venueImageUrl: string;
  seats: SeatData[];
  priceCategories: PriceCategory[];
  maxSeatsPerSelection?: number;
  onSeatSelection?: (selectedSeats: SeatData[]) => void;
  onPurchaseClick?: (selectedSeats: SeatData[]) => void;
  showPricing?: boolean;
  className?: string;
}

const InteractiveSeatingChart: React.FC<InteractiveSeatingChartProps> = ({
  venueImageUrl,
  seats,
  priceCategories,
  maxSeatsPerSelection = 8,
  onSeatSelection,
  onPurchaseClick,
  showPricing = true,
  className
}) => {
  const [selectedSeats, setSelectedSeats] = useState<SeatData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHoldTimers, setShowHoldTimers] = useState(true);
  const [dragThreshold] = useState(5); // Minimum distance to start dragging
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSeatClick = useCallback((seat: SeatData, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (seat.status === 'sold' || seat.status === 'reserved') {
      toast.error('This seat is not available');
      return;
    }

    if (seat.status === 'held' && !selectedSeats.find(s => s.id === seat.id)) {
      toast.error('This seat is currently held by another customer');
      return;
    }

    const isSelected = selectedSeats.find(s => s.id === seat.id);
    
    if (isSelected) {
      const newSelection = selectedSeats.filter(s => s.id !== seat.id);
      setSelectedSeats(newSelection);
      onSeatSelection?.(newSelection);
    } else {
      if (selectedSeats.length >= maxSeatsPerSelection) {
        toast.error(`Maximum ${maxSeatsPerSelection} seats can be selected`);
        return;
      }
      
      const newSelection = [...selectedSeats, { ...seat, status: 'selected' }];
      setSelectedSeats(newSelection);
      onSeatSelection?.(newSelection);
      toast.success(`Seat ${seat.seatNumber} selected`);
    }
  }, [selectedSeats, maxSeatsPerSelection, onSeatSelection]);

  // Add container click handler for coordinate-based seat selection (supports both mouse and touch)
  const handleContainerClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || isDragging) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Get click/touch position relative to container
    let clientX, clientY;
    if ('touches' in event && event.touches.length > 0) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('changedTouches' in event && event.changedTouches.length > 0) {
      // Touch end event
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      // Mouse event
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }
    
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    
    // Adjust for pan and zoom transformations
    const adjustedX = (clickX - pan.x) / zoom;
    const adjustedY = (clickY - pan.y) / zoom;
    
    // Find the closest seat within click tolerance
    const tolerance = Math.max(20 / zoom, 15); // Minimum 15px tolerance for touch
    let closestSeat: SeatData | null = null;
    let closestDistance = Infinity;
    
    seats.forEach(seat => {
      const seatCenterX = (seat.x / 100) * containerWidth;
      const seatCenterY = (seat.y / 100) * containerHeight;
      
      const distance = Math.sqrt(
        Math.pow(adjustedX - seatCenterX, 2) + 
        Math.pow(adjustedY - seatCenterY, 2)
      );
      
      if (distance < tolerance && distance < closestDistance) {
        closestSeat = seat;
        closestDistance = distance;
      }
    });
    
    if (closestSeat) {
      // Create a synthetic mouse event for consistency
      const syntheticEvent = {
        ...event,
        stopPropagation: () => event.stopPropagation?.(),
        clientX,
        clientY
      } as React.MouseEvent;
      handleSeatClick(closestSeat, syntheticEvent);
    }
  }, [containerRef, isDragging, pan, zoom, seats, handleSeatClick]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    // Only start dragging if clicking on the container itself (not on seats)
    if (event.target === event.currentTarget) {
      setIsDragging(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      
      // Only start panning if movement exceeds threshold
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > dragThreshold) {
        setPan({
          x: deltaX,
          y: deltaY
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getTotalPrice = () => {
    return selectedSeats.reduce((total, seat) => total + seat.price, 0);
  };

  const getSeatsByCategory = () => {
    const counts: Record<string, { total: number; available: number; selected: number }> = {};
    
    seats.forEach(seat => {
      if (!counts[seat.category]) {
        counts[seat.category] = { total: 0, available: 0, selected: 0 };
      }
      counts[seat.category].total++;
      
      if (seat.status === 'available') {
        counts[seat.category].available++;
      }
      
      if (selectedSeats.find(s => s.id === seat.id)) {
        counts[seat.category].selected++;
      }
    });
    
    return counts;
  };

  const renderSeat = (seat: SeatData) => {
    const isSelected = selectedSeats.find(s => s.id === seat.id);
    const baseSize = 16;
    const size = baseSize * zoom;
    
    let backgroundColor = seat.categoryColor;
    let borderColor = '#ffffff';
    let opacity = 1;
    
    switch (seat.status) {
      case 'sold':
        backgroundColor = '#6b7280';
        opacity = 0.6;
        break;
      case 'reserved':
        backgroundColor = '#ef4444';
        opacity = 0.8;
        break;
      case 'held':
        backgroundColor = '#f59e0b';
        opacity = 0.7;
        break;
      case 'selected':
      case 'available':
        if (isSelected) {
          borderColor = '#10b981';
          backgroundColor = '#10b981';
        }
        break;
    }

    return (
      <div
        key={seat.id}
        className={cn(
          "absolute rounded-full border-2 cursor-pointer transition-all duration-200 flex items-center justify-center",
          "hover:scale-110 hover:z-10",
          seat.status === 'available' || isSelected ? "hover:shadow-lg" : "cursor-not-allowed"
        )}
        style={{
          left: `${seat.x}%`,
          top: `${seat.y}%`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor,
          borderColor,
          opacity,
          transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.1)' : 'scale(1)'}`,
          transformOrigin: 'center center'
        }}
        onClick={(e) => handleSeatClick(seat, e)}
        title={`${seat.seatNumber}${seat.row ? ` Row ${seat.row}` : ''}${seat.section ? ` Section ${seat.section}` : ''} - $${seat.price}${seat.isADA ? ' (ADA)' : ''} - ${seat.status}`}
      >
        {seat.isADA && size > 12 && (
          <Accessibility className="text-white" style={{ width: size * 0.6, height: size * 0.6 }} />
        )}
        {seat.status === 'held' && showHoldTimers && seat.holdExpiry && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 text-xs px-1 py-0.5 rounded whitespace-nowrap">
            <Clock className="w-3 h-3 inline mr-1" />
            {Math.max(0, Math.ceil((seat.holdExpiry.getTime() - Date.now()) / 60000))}m
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {/* Main Chart */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Interactive Seating Chart
              </CardTitle>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing touch-none"
              style={{ height: '500px' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleContainerClick}
              onTouchEnd={handleContainerClick}
            >
              <div
                className="relative w-full h-full"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                <img
                  src={venueImageUrl}
                  alt="Venue layout"
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
                
                {/* Render all seats */}
                {seats.map(renderSeat)}
              </div>
              
              {/* Instructions */}
              <div className="absolute top-4 left-4 bg-black/75 text-white text-sm px-3 py-2 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-3 w-3" />
                  <span>Click seats to select • Drag to pan • Use zoom controls</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 space-y-4">
        {/* Selection Summary */}
        {selectedSeats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Selected Seats ({selectedSeats.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedSeats.map(seat => (
                  <div key={seat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: seat.categoryColor }}
                      />
                      <span>{seat.seatNumber}</span>
                      {seat.isADA && <Accessibility className="h-3 w-3 text-green-600" />}
                    </div>
                    <span className="font-medium">${seat.price}</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex items-center justify-between font-semibold">
                  <span>Total:</span>
                  <span className="text-lg">${getTotalPrice()}</span>
                </div>
                
                {onPurchaseClick && (
                  <Button 
                    className="w-full" 
                    onClick={() => onPurchaseClick(selectedSeats)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Continue to Purchase
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Legend */}
        {showPricing && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priceCategories.map(category => {
                  const counts = getSeatsByCategory()[category.id] || { total: 0, available: 0, selected: 0 };
                  
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <div className="font-medium">{category.name}</div>
                            {category.description && (
                              <div className="text-xs text-muted-foreground">{category.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${category.price}</div>
                          <div className="text-xs text-muted-foreground">
                            {counts.available} available
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Separator />
                
                {/* Status Legend */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Seat Status:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 border border-white" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500 border border-white opacity-60" />
                      <span>Sold</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 border border-white opacity-70" />
                      <span>On Hold</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <Accessibility className="h-3 w-3 text-green-600" />
                    <span className="text-xs">ADA Accessible</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Venue Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Seats:</span>
                <span className="font-medium">{seats.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Available:</span>
                <span className="font-medium text-green-600">
                  {seats.filter(s => s.status === 'available').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sold:</span>
                <span className="font-medium text-gray-600">
                  {seats.filter(s => s.status === 'sold').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ADA Seats:</span>
                <span className="font-medium">{seats.filter(s => s.isADA).length}</span>
              </div>
              {selectedSeats.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-stepping-purple font-semibold">
                    <span>Selected:</span>
                    <span>{selectedSeats.length}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InteractiveSeatingChart;