import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, Users, DollarSign } from 'lucide-react';
import { seatingService, AvailableSeat } from '@/lib/services/SeatingService';
import { toast } from 'sonner';

interface SeatingChartProps {
  eventId: string;
  seatingChartId: string;
  onSeatsSelected?: (seats: AvailableSeat[]) => void;
  maxSeats?: number;
  className?: string;
}

export const SeatingChart = ({
  eventId,
  seatingChartId,
  onSeatsSelected,
  maxSeats = 8,
  className = ""
}: SeatingChartProps) => {
  const [seats, setSeats] = useState<AvailableSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<AvailableSeat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => seatingService.generateSessionId());

  useEffect(() => {
    loadAvailableSeats();
  }, [eventId, seatingChartId]);

  useEffect(() => {
    onSeatsSelected?.(selectedSeats);
  }, [selectedSeats, onSeatsSelected]);

  const loadAvailableSeats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const availableSeats = await seatingService.getAvailableSeats(eventId, seatingChartId);
      setSeats(availableSeats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load seating chart';
      setError(errorMessage);
      console.error('Error loading seats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeatClick = (seat: AvailableSeat) => {
    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.seat_id === seat.seat_id);
      
      if (isSelected) {
        // Deselect seat
        return prev.filter(s => s.seat_id !== seat.seat_id);
      } else {
        // Select seat (check max limit)
        if (prev.length >= maxSeats) {
          toast.error(`You can select up to ${maxSeats} seats`);
          return prev;
        }
        return [...prev, seat];
      }
    });
  };

  const holdSelectedSeats = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    try {
      const seatIds = selectedSeats.map(s => s.seat_id);
      await seatingService.holdSeats(seatIds, eventId, sessionId, {
        holdDurationMinutes: 15
      });
      
      toast.success(`${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''} held for 15 minutes`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to hold seats';
      toast.error(errorMessage);
      console.error('Error holding seats:', err);
    }
  };

  const getSeatsBySection = () => {
    const sections: { [key: string]: AvailableSeat[] } = {};
    
    seats.forEach(seat => {
      const section = seat.section || 'General';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(seat);
    });

    return sections;
  };

  const getSeatColor = (seat: AvailableSeat) => {
    const isSelected = selectedSeats.some(s => s.seat_id === seat.seat_id);
    
    if (isSelected) {
      return 'bg-primary text-primary-foreground';
    }
    
    if (seat.is_premium) {
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    }
    
    if (seat.is_accessible) {
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    }
    
    return seat.category_color 
      ? `bg-gray-100 text-gray-800 hover:bg-gray-200 border-l-4`
      : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.current_price || 0), 0);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading seating chart...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={loadAvailableSeats} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sectionedSeats = getSeatsBySection();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Select Your Seats
        </CardTitle>
        <CardDescription>
          Choose up to {maxSeats} seats from the available options
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Seat Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border rounded"></div>
            <span>Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border rounded"></div>
            <span>Accessible</span>
          </div>
        </div>

        {/* Seating Sections */}
        <div className="space-y-6">
          {Object.entries(sectionedSeats).map(([sectionName, sectionSeats]) => (
            <div key={sectionName}>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {sectionName}
                <Badge variant="secondary">{sectionSeats.length} available</Badge>
              </h3>
              
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1">
                {sectionSeats
                  .sort((a, b) => {
                    // Sort by row, then seat number
                    const rowCompare = (a.row_label || '').localeCompare(b.row_label || '');
                    if (rowCompare !== 0) return rowCompare;
                    return (a.seat_number || '').localeCompare(b.seat_number || '');
                  })
                  .map((seat) => (
                    <button
                      key={seat.seat_id}
                      onClick={() => handleSeatClick(seat)}
                      className={`
                        w-8 h-8 text-xs rounded border transition-colors
                        ${getSeatColor(seat)}
                        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                      `}
                      title={`${seat.seat_identifier} - $${seat.current_price?.toFixed(2) || '0.00'}`}
                    >
                      {seat.seat_number || seat.seat_identifier?.split('-').pop()}
                    </button>
                  ))
                }
              </div>
            </div>
          ))}
        </div>

        {/* Selection Summary */}
        {selectedSeats.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Selected Seats</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {selectedSeats.map((seat) => (
                  <div key={seat.seat_id} className="flex justify-between items-center text-sm">
                    <span>
                      {seat.seat_identifier}
                      {seat.is_premium && <Badge className="ml-1" variant="secondary">Premium</Badge>}
                      {seat.is_accessible && <Badge className="ml-1" variant="outline">Accessible</Badge>}
                    </span>
                    <span className="font-medium">${seat.current_price?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-l pl-4">
                <div className="flex justify-between items-center text-lg font-medium">
                  <span>Total:</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {totalPrice.toFixed(2)}
                  </span>
                </div>
                <Button 
                  onClick={holdSelectedSeats}
                  className="w-full mt-3"
                  size="sm"
                >
                  Hold Seats (15 min)
                </Button>
              </div>
            </div>
          </div>
        )}

        {seats.length === 0 && (
          <Alert>
            <AlertDescription>
              No seats are currently available for this event.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};