/**
 * Preserved features from steppers-safe-v2-3-main seating components
 * These features can be integrated into the existing seating components
 */

// ============================================
// HOLD TIMER FEATURE
// From: CustomerSeatingSelector.tsx
// ============================================

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertCircle } from 'lucide-react';

interface HoldTimerProps {
  selectedSeats: any[];
  allowHoldTimer: boolean;
  holdDurationSeconds?: number;
  onExpire: () => void;
}

export function HoldTimer({ 
  selectedSeats, 
  allowHoldTimer, 
  holdDurationSeconds = 600, // 10 minutes default
  onExpire 
}: HoldTimerProps) {
  const [holdTimer, setHoldTimer] = useState<number>(0);

  useEffect(() => {
    if (selectedSeats.length > 0 && allowHoldTimer) {
      setHoldTimer(holdDurationSeconds);
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            onExpire();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedSeats.length, allowHoldTimer, holdDurationSeconds, onExpire]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (selectedSeats.length === 0 || !allowHoldTimer || holdTimer === 0) {
    return null;
  }

  return (
    <div className="text-center">
      <div className="text-sm text-text-secondary mb-1">Seats held for</div>
      <div className={`text-lg font-bold ${holdTimer < 60 ? 'text-red-500' : 'text-brand-primary'}`}>
        {formatTime(holdTimer)}
      </div>
      <Progress 
        value={(holdTimer / holdDurationSeconds) * 100} 
        className="w-24 h-2 mt-1"
      />
      {holdTimer < 60 && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Hurry! Seats expire in {formatTime(holdTimer)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SEAT RECOMMENDATIONS FEATURE
// From: CustomerSeatingSelector.tsx
// ============================================

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SeatWithFeatures {
  id: string;
  seatNumber: string;
  price: number;
  features?: string[];
  recommendedFor?: string[];
  status: string;
}

interface SeatRecommendationsProps {
  seats: SeatWithFeatures[];
  onSeatClick: (seat: SeatWithFeatures) => void;
  maxRecommendations?: number;
}

export function SeatRecommendations({ 
  seats, 
  onSeatClick, 
  maxRecommendations = 6 
}: SeatRecommendationsProps) {
  const getRecommendedSeats = () => {
    return seats
      .filter(seat => 
        seat.status === 'available' && 
        seat.features && 
        seat.features.length > 0
      )
      .slice(0, maxRecommendations);
  };

  const recommendedSeats = getRecommendedSeats();

  if (recommendedSeats.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-base font-medium flex items-center">
        <Star className="w-4 h-4 mr-2 text-yellow-500" />
        Recommended Seats
      </h3>
      <div className="space-y-2">
        {recommendedSeats.slice(0, 3).map(seat => (
          <div 
            key={seat.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onSeatClick(seat)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{seat.seatNumber}</div>
                <div className="text-xs text-gray-600">${seat.price}</div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {seat.features?.[0]}
              </Badge>
            </div>
            {seat.recommendedFor && seat.recommendedFor.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Ideal for: {seat.recommendedFor.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// INVENTORY INTEGRATION HOOK
// From: EnhancedSeatingChartSelector.tsx
// ============================================

interface InventoryHold {
  id: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  sessionId: string;
  userId?: string;
  holdType: 'checkout' | 'admin';
  expiresAt: Date;
}

interface CreateHoldParams {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  sessionId: string;
  userId?: string;
  holdType: 'checkout' | 'admin';
  holdDurationMinutes: number;
}

interface UseInventoryReturn {
  getTicketAvailabilityStatus: (ticketTypeId: string) => Promise<{ available: number; held: number; sold: number }>;
  createHold: (params: CreateHoldParams) => Promise<{ success: boolean; hold?: InventoryHold; message?: string }>;
  releaseHold: (holdId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useInventory(eventId: string): UseInventoryReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getTicketAvailabilityStatus = async (ticketTypeId: string) => {
    // Implementation would call your backend API
    setIsLoading(true);
    try {
      // const response = await fetch(`/api/events/${eventId}/tickets/${ticketTypeId}/availability`);
      // const data = await response.json();
      // return data;
      
      // Mock response for now
      return { available: 100, held: 10, sold: 50 };
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createHold = async (params: CreateHoldParams) => {
    setIsLoading(true);
    try {
      // const response = await fetch(`/api/events/${eventId}/holds`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(params)
      // });
      // const data = await response.json();
      // return data;
      
      // Mock response for now
      const hold: InventoryHold = {
        id: `hold_${Date.now()}`,
        ...params,
        expiresAt: new Date(Date.now() + params.holdDurationMinutes * 60000)
      };
      return { success: true, hold };
    } catch (err) {
      setError(err as Error);
      return { success: false, message: 'Failed to create hold' };
    } finally {
      setIsLoading(false);
    }
  };

  const releaseHold = async (holdId: string) => {
    setIsLoading(true);
    try {
      // await fetch(`/api/events/${eventId}/holds/${holdId}`, {
      //   method: 'DELETE'
      // });
      console.log('Released hold:', holdId);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getTicketAvailabilityStatus,
    createHold,
    releaseHold,
    isLoading,
    error
  };
}

// ============================================
// LAYOUT IMPORT/EXPORT UTILITIES
// From: SeatingLayoutManager.tsx
// ============================================

interface SeatingLayout {
  id: string;
  name: string;
  description: string;
  venueType: string;
  imageUrl: string;
  seats: any[];
  priceCategories: any[];
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  tags: string[];
}

export function exportSeatingLayout(layout: SeatingLayout): void {
  const dataStr = JSON.stringify(layout, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `seating-layout-${layout.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

export function importSeatingLayout(
  file: File, 
  onSuccess: (layout: SeatingLayout) => void,
  onError: (error: string) => void
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedLayout = JSON.parse(e.target?.result as string);
      const newLayout = {
        ...importedLayout,
        id: '', // Reset ID for new layout
        createdAt: new Date(),
        updatedAt: new Date()
      };
      onSuccess(newLayout);
    } catch (error) {
      onError('Error importing layout file');
    }
  };
  reader.readAsText(file);
}

// ============================================
// REVENUE CALCULATOR
// From: SeatingLayoutManager.tsx
// ============================================

interface PriceCategory {
  id: string;
  name: string;
  price: number;
}

interface Seat {
  priceCategory: string;
}

interface RevenueCalculation {
  byCategory: { name: string; seats: number; revenue: number }[];
  total: number;
}

export function calculateRevenuePotential(
  seats: Seat[], 
  priceCategories: PriceCategory[]
): RevenueCalculation {
  const byCategory = priceCategories.map(category => {
    const seatCount = seats.filter(s => s.priceCategory === category.id).length;
    const revenue = seatCount * category.price;
    return {
      name: category.name,
      seats: seatCount,
      revenue
    };
  });

  const total = byCategory.reduce((sum, cat) => sum + cat.revenue, 0);

  return { byCategory, total };
}

// ============================================
// ZOOM PRESETS DIALOG
// From: EnhancedSeatingChartSelector.tsx
// ============================================

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomPresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
}

export function ZoomPresetsDialog({
  open,
  onOpenChange,
  zoom,
  onZoomChange,
  onReset
}: ZoomPresetsDialogProps) {
  const presets = [0.5, 1, 1.5, 2, 2.5, 3];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>View Options</DialogTitle>
          <DialogDescription>
            Adjust the seating chart view for better visibility
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Zoom Level</label>
            <div className="flex items-center gap-2 mt-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onZoomChange(Math.max(zoom - 0.2, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-[4rem] text-center">{Math.round(zoom * 100)}%</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onZoomChange(Math.min(zoom + 0.2, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {presets.map(preset => (
              <Button
                key={preset}
                variant={zoom === preset ? 'default' : 'outline'}
                onClick={() => onZoomChange(preset)}
              >
                {preset * 100}%
              </Button>
            ))}
          </div>
          
          <Button onClick={onReset} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}