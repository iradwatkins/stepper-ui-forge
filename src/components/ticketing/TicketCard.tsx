import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuantitySelector } from './QuantitySelector';
import { TicketType } from '@/types/database';
import { Clock, Users, AlertTriangle } from 'lucide-react';

interface TicketCardProps {
  ticketType: TicketType;
  currentPrice: number;
  isEarlyBird: boolean;
  availableQuantity: number;
  selectedQuantity: number;
  onQuantityChange: (quantity: number) => void;
  className?: string;
}

export const TicketCard = ({
  ticketType,
  currentPrice,
  isEarlyBird,
  availableQuantity,
  selectedQuantity,
  onQuantityChange,
  className = ""
}: TicketCardProps) => {
  const isLowStock = availableQuantity <= 10 && availableQuantity > 0;
  const isSoldOut = availableQuantity === 0;
  
  // Format early bird end date
  const formatEarlyBirdEnd = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Calculate savings if early bird is active
  const savings = isEarlyBird && ticketType.price > currentPrice 
    ? ticketType.price - currentPrice 
    : 0;

  return (
    <Card className={`${className} ${isSoldOut ? 'opacity-60' : ''}`}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Ticket Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{ticketType.name}</h3>
                {ticketType.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticketType.description}
                  </p>
                )}
              </div>
              
              {/* Status Badges */}
              <div className="flex flex-col gap-1 items-end">
                {isEarlyBird && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Early Bird
                  </Badge>
                )}
                {isSoldOut && (
                  <Badge variant="destructive">Sold Out</Badge>
                )}
                {isLowStock && !isSoldOut && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Only {availableQuantity} left
                  </Badge>
                )}
              </div>
            </div>

            {/* Early Bird Info */}
            {isEarlyBird && ticketType.early_bird_until && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Clock className="w-4 h-4" />
                <span>Early bird ends {formatEarlyBirdEnd(ticketType.early_bird_until)}</span>
              </div>
            )}

            {/* Availability Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{availableQuantity} available</span>
              </div>
              {ticketType.max_per_person && (
                <span>Max {ticketType.max_per_person} per person</span>
              )}
            </div>
          </div>

          {/* Price and Selection */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            {/* Price Display */}
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${currentPrice.toFixed(2)}
              </div>
              {savings > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">${ticketType.price.toFixed(2)}</span>
                  <span className="text-green-600 ml-2 font-medium">
                    Save ${savings.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            {!isSoldOut ? (
              <QuantitySelector
                value={selectedQuantity}
                onChange={onQuantityChange}
                min={0}
                max={Math.min(
                  availableQuantity, 
                  ticketType.max_per_person || availableQuantity
                )}
                disabled={isSoldOut}
              />
            ) : (
              <Button variant="outline" disabled className="min-w-[120px]">
                Sold Out
              </Button>
            )}
          </div>
        </div>

        {/* Selected Tickets Summary */}
        {selectedQuantity > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {selectedQuantity} × {ticketType.name}
              </span>
              <span className="font-medium">
                ${(currentPrice * selectedQuantity).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};