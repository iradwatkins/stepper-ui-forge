import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  MousePointer2, 
  Undo2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Info,
  Circle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface TicketMapping {
  ticketTypeId: string;
  sectionName: string;
  color: string;
  seats: number;
  description?: string;
}

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

interface Seat {
  id: string;
  x: number;
  y: number;
  ticketTypeId: string;
  sectionName: string;
  color: string;
  seatNumber: number;
}

interface InteractiveSeatingEditorProps {
  floorPlanImage: string;
  ticketMappings: TicketMapping[];
  ticketTypes: TicketType[];
  onSeatsConfigured: (seats: Seat[]) => void;
  className?: string;
}

export const InteractiveSeatingEditor = ({
  floorPlanImage,
  ticketMappings,
  ticketTypes,
  onSeatsConfigured,
  className
}: InteractiveSeatingEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>(ticketMappings[0]?.ticketTypeId || '');
  const [isPlacingSeats, setIsPlacingSeats] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load and draw floor plan image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !floorPlanImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      // Set canvas size to container size
      const containerRect = container.getBoundingClientRect();
      canvas.width = containerRect.width;
      canvas.height = Math.min(containerRect.width * (image.height / image.width), 600);

      setImageDimensions({ width: image.width, height: image.height });
      setImageLoaded(true);
      redrawCanvas(ctx, canvas, image);
    };
    image.src = floorPlanImage;
  }, [floorPlanImage]);

  // Redraw canvas when seats, zoom, or pan changes
  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [seats, zoom, pan, imageLoaded]);

  const redrawCanvas = useCallback((ctx?: CanvasRenderingContext2D, canvas?: HTMLCanvasElement, image?: HTMLImageElement) => {
    const canvasElement = canvas || canvasRef.current;
    const context = ctx || canvasElement?.getContext('2d');
    if (!canvasElement || !context) return;

    // Clear canvas
    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Save context for transformations
    context.save();

    // Apply zoom and pan
    context.translate(pan.x, pan.y);
    context.scale(zoom, zoom);

    // Draw floor plan image
    if (image || floorPlanImage) {
      const img = image || new Image();
      if (!image) {
        img.src = floorPlanImage;
      }
      
      if (img.complete || image) {
        context.drawImage(img, 0, 0, canvasElement.width / zoom, canvasElement.height / zoom);
      }
    }

    // Draw seats
    seats.forEach((seat) => {
      const mapping = ticketMappings.find(m => m.ticketTypeId === seat.ticketTypeId);
      if (!mapping) return;

      // Draw seat circle
      context.beginPath();
      context.arc(seat.x, seat.y, 8, 0, 2 * Math.PI);
      context.fillStyle = mapping.color;
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();

      // Draw seat number
      context.fillStyle = '#ffffff';
      context.font = '10px Arial';
      context.textAlign = 'center';
      context.fillText(seat.seatNumber.toString(), seat.x, seat.y + 3);
    });

    context.restore();
  }, [seats, zoom, pan, floorPlanImage, ticketMappings]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    
    return { x, y };
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlacingSeats || !selectedTicketType) return;

    const { x, y } = getCanvasCoordinates(event);
    
    // Check if clicking on existing seat to remove it
    const clickedSeat = seats.find(seat => {
      const distance = Math.sqrt(Math.pow(seat.x - x, 2) + Math.pow(seat.y - y, 2));
      return distance <= 12; // Click tolerance
    });

    if (clickedSeat) {
      // Remove seat
      const newSeats = seats.filter(seat => seat.id !== clickedSeat.id);
      setSeats(newSeats);
      onSeatsConfigured(newSeats);
      toast.success('Seat removed');
      return;
    }

    // Check if we've reached the limit for this ticket type
    const mapping = ticketMappings.find(m => m.ticketTypeId === selectedTicketType);
    const currentCount = seats.filter(seat => seat.ticketTypeId === selectedTicketType).length;
    
    if (mapping && currentCount >= mapping.seats) {
      toast.error(`Maximum ${mapping.seats} seats allowed for ${mapping.sectionName}`);
      return;
    }

    // Add new seat
    const sectionSeats = seats.filter(seat => seat.ticketTypeId === selectedTicketType);
    const seatNumber = sectionSeats.length + 1;
    
    const newSeat: Seat = {
      id: `${selectedTicketType}-${Date.now()}`,
      x,
      y,
      ticketTypeId: selectedTicketType,
      sectionName: mapping?.sectionName || '',
      color: mapping?.color || '#3B82F6',
      seatNumber
    };

    const newSeats = [...seats, newSeat];
    setSeats(newSeats);
    onSeatsConfigured(newSeats);
    toast.success('Seat added');
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlacingSeats) return;
    
    setIsDragging(true);
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || isPlacingSeats) return;

    setPan({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleClearSeats = () => {
    setSeats([]);
    onSeatsConfigured([]);
    toast.success('All seats cleared');
  };

  const getSeatCount = (ticketTypeId: string) => {
    return seats.filter(seat => seat.ticketTypeId === ticketTypeId).length;
  };

  const getTotalSeats = () => {
    return seats.length;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Interactive Seat Placement</h3>
        <p className="text-muted-foreground">
          Click on the floor plan to place seats. Click existing seats to remove them.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Seating Tools</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{getTotalSeats()} total seats</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ticket Type Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Ticket Type to Place:</label>
            <div className="flex flex-wrap gap-2">
              {ticketMappings.map((mapping) => {
                const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
                const seatCount = getSeatCount(mapping.ticketTypeId);
                const isSelected = selectedTicketType === mapping.ticketTypeId;
                
                return (
                  <Button
                    key={mapping.ticketTypeId}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTicketType(mapping.ticketTypeId)}
                    className="flex items-center gap-2"
                  >
                    <Circle 
                      className="w-3 h-3" 
                      style={{ color: mapping.color, fill: mapping.color }} 
                    />
                    {mapping.sectionName}
                    <Badge variant="secondary" className="ml-1">
                      {seatCount}/{mapping.seats}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={isPlacingSeats ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPlacingSeats(!isPlacingSeats)}
            >
              <MousePointer2 className="w-4 h-4 mr-2" />
              {isPlacingSeats ? 'Placing Seats' : 'Pan Mode'}
            </Button>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleResetView}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset View
            </Button>

            <Button variant="outline" size="sm" onClick={handleClearSeats}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={containerRef}
            className="relative w-full h-[600px] overflow-hidden rounded-lg"
            style={{ cursor: isPlacingSeats ? 'crosshair' : 'grab' }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Instructions:</strong> Select a ticket type above, then click "Placing Seats" mode. 
          Click on the floor plan to add seats, click existing seats to remove them. 
          Use pan mode to move around the floor plan, and zoom controls to get a better view.
        </AlertDescription>
      </Alert>

      {/* Seat Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Seat Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketMappings.map((mapping) => {
              const ticketType = ticketTypes.find(t => t.id === mapping.ticketTypeId);
              const seatCount = getSeatCount(mapping.ticketTypeId);
              const progress = (seatCount / mapping.seats) * 100;
              
              return (
                <div key={mapping.ticketTypeId} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Circle 
                      className="w-4 h-4" 
                      style={{ color: mapping.color, fill: mapping.color }} 
                    />
                    <span className="font-medium">{mapping.sectionName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    ${ticketType?.price} • {seatCount} of {mapping.seats} seats placed
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${progress}%`, 
                        backgroundColor: mapping.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};