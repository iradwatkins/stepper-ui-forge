import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { MapPin, Users, DollarSign, ShoppingCart, Clock, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

interface SeatPosition {
  id: string;
  x: number;
  y: number;
  seatNumber: string;
  row?: string;
  section?: string;
  priceCategory: string;
  isADA: boolean;
  status: 'available' | 'sold' | 'reserved' | 'blocked' | 'held';
  price: number;
  category: string;
  categoryColor: string;
}

interface SeatingChart {
  id: string;
  name: string;
  imageUrl: string;
  seats: SeatPosition[];
}

interface PriceCategory {
  id: string;
  name: string;
  price: number;
  color: string;
  basePrice: number;
}

interface SelectedSeat extends SeatPosition {
  selected: boolean;
}

interface SimpleSeatingChartProps {
  eventId: string;
  seatingChart: SeatingChart;
  priceCategories: PriceCategory[];
  onSeatsSelected: (seats: SelectedSeat[]) => void;
  maxSelectable?: number;
  venueImageUrl: string;
  seats: SeatPosition[];
  selectedSeats?: string[];
  onSeatSelection?: (seatIds: string[]) => void;
  onPurchaseClick?: () => void;
  maxSelectableSeats?: number;
  showPurchaseButton?: boolean;
  disabled?: boolean;
  allowHoldTimer?: boolean;
  holdDurationMinutes?: number;
}

const SimpleSeatingChart: React.FC<SimpleSeatingChartProps> = ({
  eventId,
  seatingChart,
  priceCategories,
  onSeatsSelected,
  maxSelectable = 10,
  venueImageUrl,
  seats,
  selectedSeats = [],
  onSeatSelection,
  onPurchaseClick,
  maxSelectableSeats = 10,
  showPurchaseButton = true,
  disabled = false,
  allowHoldTimer = true,
  holdDurationMinutes = 10
}) => {
  const [internalSelectedSeats, setInternalSelectedSeats] = useState<SelectedSeat[]>([]);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [holdStartTime, setHoldStartTime] = useState<Date | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Use props or internal state
  const actualSelectedSeats = selectedSeats || internalSelectedSeats.map(s => s.id);
  const actualSeats = seats || seatingChart?.seats || [];
  const actualMaxSelectable = maxSelectableSeats || maxSelectable;

  // Hold timer countdown from reference implementation
  useEffect(() => {
    if (actualSelectedSeats.length > 0 && allowHoldTimer) {
      // Start hold timer when first seat is selected
      if (holdTimer === 0) {
        const totalSeconds = holdDurationMinutes * 60;
        setHoldTimer(totalSeconds);
        setHoldStartTime(new Date());
        console.log('🕐 Hold timer started:', totalSeconds, 'seconds');
      }

      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            // Timer expired - clear selections
            console.log('⏰ Hold timer expired - releasing seats');
            if (onSeatSelection) {
              onSeatSelection([]);
            } else {
              setInternalSelectedSeats([]);
            }
            setHoldStartTime(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (actualSelectedSeats.length === 0) {
      // Reset timer when no seats selected
      setHoldTimer(0);
      setHoldStartTime(null);
    }
  }, [actualSelectedSeats.length, allowHoldTimer, holdDurationMinutes, onSeatSelection]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate timer progress percentage
  const getTimerProgress = () => {
    const totalSeconds = holdDurationMinutes * 60;
    return ((totalSeconds - holdTimer) / totalSeconds) * 100;
  };

  // Zoom and pan controls from reference implementation
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoom(1);
    setTransform({ x: 0, y: 0 });
  };

  // Mouse/touch event handlers for pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - transform.x, 
      y: e.clientY - transform.y 
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging]);

  const handleSeatClick = useCallback((seat: SeatPosition) => {
    console.log('🖱️ Seat clicked:', seat.seatNumber, seat.id);
    
    if (disabled || seat.status !== 'available') {
      console.log('🚫 Click ignored - disabled or seat not available', { disabled, status: seat.status });
      return;
    }

    const isSelected = actualSelectedSeats.includes(seat.id);

    if (isSelected) {
      // Deselect seat
      if (onSeatSelection) {
        const newSelection = actualSelectedSeats.filter(id => id !== seat.id);
        console.log('❌ Deselecting seat:', seat.id, 'New selection:', newSelection);
        onSeatSelection(newSelection);
      } else {
        const updated = internalSelectedSeats.filter(s => s.id !== seat.id);
        setInternalSelectedSeats(updated);
        onSeatsSelected(updated);
      }
    } else {
      // Select seat (if under limit)
      if (actualSelectedSeats.length >= actualMaxSelectable) {
        console.log('⚠️ Max seats reached:', actualMaxSelectable);
        return;
      }

      if (onSeatSelection) {
        const newSelection = [...actualSelectedSeats, seat.id];
        console.log('✅ Selecting seat:', seat.id, 'New selection:', newSelection);
        onSeatSelection(newSelection);
      } else {
        const updated = [...internalSelectedSeats, { ...seat, selected: true }];
        setInternalSelectedSeats(updated);
        onSeatsSelected(updated);
      }
    }
  }, [disabled, actualSelectedSeats, actualMaxSelectable, onSeatSelection, internalSelectedSeats, onSeatsSelected]);

  const getPriceCategoryColor = (categoryId: string) => {
    return priceCategories.find(cat => cat.id === categoryId)?.color || '#3B82F6';
  };

  const getSeatDisplayColor = (seat: SeatPosition) => {
    const isSelected = actualSelectedSeats.includes(seat.id);
    
    if (isSelected) return '#10B981'; // Green for selected
    
    switch (seat.status) {
      case 'available': return seat.categoryColor || getPriceCategoryColor(seat.priceCategory || seat.category);
      case 'sold': return '#EF4444';
      case 'reserved': return '#F59E0B';
      case 'blocked': return '#6B7280';
      case 'held': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const getTotalPrice = () => {
    return actualSeats
      .filter(seat => actualSelectedSeats.includes(seat.id))
      .reduce((total, seat) => total + seat.price, 0);
  };

  const statistics = useMemo(() => {
    const total = actualSeats.length;
    const available = actualSeats.filter(s => s.status === 'available').length;
    const selected = actualSelectedSeats.length;
    const sold = actualSeats.filter(s => s.status === 'sold').length;
    const totalPrice = getTotalPrice();

    return { total, available, selected, sold, totalPrice };
  }, [actualSeats, actualSelectedSeats]);

  return (
    <div className="space-y-6">
      <Card className="bg-surface-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-text-primary flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-brand-primary" />
            Select Your Seats - {seatingChart?.name || 'Event Seating'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Seating Chart */}
            <div className="lg:col-span-3">
              <div className="relative border border-border-default rounded-lg overflow-hidden bg-white">
                {/* Zoom/Pan Controls */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={zoomIn}
                    className="bg-white shadow-md hover:bg-gray-50"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={zoomOut}
                    className="bg-white shadow-md hover:bg-gray-50"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetView}
                    className="bg-white shadow-md hover:bg-gray-50"
                    title="Reset View"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <div className="px-2 py-1 bg-white rounded border text-xs font-medium">
                    {Math.round(zoom * 100)}%
                  </div>
                </div>

                {/* Pan instruction */}
                {zoom > 1 && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white px-3 py-1 rounded border shadow-md">
                    <Move className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600">Click and drag to pan</span>
                  </div>
                )}

                {/* Zoomable/Pannable Container */}
                <div 
                  className="relative cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `scale(${zoom}) translate(${transform.x / zoom}px, ${transform.y / zoom}px)`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img 
                    src={venueImageUrl || seatingChart?.imageUrl} 
                    alt={seatingChart?.name || 'Venue Layout'}
                    className="w-full h-auto select-none"
                    draggable={false}
                  />
                  
                  {/* Render seats as absolute positioned divs */}
                  {actualSeats.map(seat => (
                    <div
                      key={seat.id}
                      className={`absolute w-6 h-6 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold text-white transition-all duration-200 ${
                        seat.status === 'available' ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                      }`}
                      style={{
                        left: `${seat.x}%`,
                        top: `${seat.y}%`,
                        backgroundColor: getSeatDisplayColor(seat)
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeatClick(seat);
                      }}
                      title={`${seat.seatNumber} ${seat.row ? `Row ${seat.row}` : ''} ${seat.section ? `Section ${seat.section}` : ''} - $${seat.price} ${seat.isADA ? '(ADA)' : ''}`}
                    >
                      {seat.isADA ? '♿' : seat.seatNumber.slice(-2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend and Selection Summary */}
            <div className="space-y-4">
              {/* Hold Timer Display */}
              {allowHoldTimer && holdTimer > 0 && (
                <Alert className={holdTimer <= 60 ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}>
                  <Clock className={`h-4 w-4 ${holdTimer <= 60 ? "text-red-600" : "text-orange-600"}`} />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Seats held for:</span>
                        <span className={`text-lg font-bold ${holdTimer <= 60 ? "text-red-600" : "text-orange-600"}`}>
                          {formatTime(holdTimer)}
                        </span>
                      </div>
                      <Progress 
                        value={getTimerProgress()} 
                        className={`h-2 ${holdTimer <= 60 ? "bg-red-100" : "bg-orange-100"}`}
                      />
                      {holdTimer <= 60 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">Hurry! Seats will be released soon</span>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h4 className="font-medium text-text-primary mb-3">Legend</h4>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Selected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">Sold</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Reserved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                    <span className="text-sm">Unavailable</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Price Categories</h5>
                  {priceCategories.map(category => (
                    <div key={category.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <span className="text-sm font-medium">${category.basePrice || category.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection Summary */}
              {statistics.selected > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-text-primary mb-3 flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Selected Seats ({statistics.selected})
                    </h4>
                    
                    <div className="space-y-2 mb-4">
                      {actualSeats
                        .filter(seat => actualSelectedSeats.includes(seat.id))
                        .map(seat => (
                        <div key={seat.id} className="flex items-center justify-between text-sm">
                          <span>{seat.seatNumber} {seat.section ? `(${seat.section})` : ''}</span>
                          <span className="font-medium">${seat.price}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between font-medium text-brand-primary border-t pt-2">
                      <span>Total:</span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {statistics.totalPrice}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Purchase Button */}
              {showPurchaseButton && statistics.selected > 0 && (
                <Button 
                  onClick={onPurchaseClick}
                  disabled={disabled || statistics.selected === 0}
                  className="w-full flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Purchase ${statistics.totalPrice}
                </Button>
              )}

              {/* Statistics */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Total Seats: {statistics.total}</div>
                <div>Available: {statistics.available}</div>
                <div>Selected: {statistics.selected} / {actualMaxSelectable}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleSeatingChart;