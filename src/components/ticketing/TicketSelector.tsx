import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TicketCard } from './TicketCard';
import { PriceCalculator } from './PriceCalculator';
import { TicketType } from '@/types/database';
import { AlertCircle, ShoppingCart, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal';
import { toast } from 'sonner';

interface SelectedTicket {
  ticketTypeId: string;
  quantity: number;
  ticketType: TicketType;
}

interface TicketSelectorProps {
  eventId: string;
  ticketTypes: TicketType[];
  onAddToCart?: (selections: SelectedTicket[]) => void;
  isLoading?: boolean;
  className?: string;
}

export const TicketSelector = ({
  eventId,
  ticketTypes,
  onAddToCart,
  isLoading = false,
  className = ""
}: TicketSelectorProps) => {
  const { user } = useAuth();
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showLogin, setShowLogin] = useState(false);

  // Get current effective price for a ticket type (early bird if applicable)
  const getCurrentPrice = (ticketType: TicketType): number => {
    if (ticketType.early_bird_price && ticketType.early_bird_until) {
      const earlyBirdEnd = new Date(ticketType.early_bird_until);
      const now = new Date();
      if (now <= earlyBirdEnd) {
        return ticketType.early_bird_price;
      }
    }
    return ticketType.price;
  };

  // Check if early bird pricing is active
  const isEarlyBirdActive = (ticketType: TicketType): boolean => {
    if (!ticketType.early_bird_price || !ticketType.early_bird_until) {
      return false;
    }
    const earlyBirdEnd = new Date(ticketType.early_bird_until);
    const now = new Date();
    return now <= earlyBirdEnd;
  };

  // Get available quantity for a ticket type
  const getAvailableQuantity = (ticketType: TicketType): number => {
    return Math.max(0, ticketType.quantity - ticketType.sold_quantity);
  };

  // Handle quantity change for a ticket type
  const handleQuantityChange = (ticketType: TicketType, quantity: number) => {
    setSelectedTickets(prev => {
      const existing = prev.find(item => item.ticketTypeId === ticketType.id);
      
      if (quantity === 0) {
        // Remove from selection
        return prev.filter(item => item.ticketTypeId !== ticketType.id);
      }
      
      if (existing) {
        // Update existing selection
        return prev.map(item =>
          item.ticketTypeId === ticketType.id
            ? { ...item, quantity }
            : item
        );
      } else {
        // Add new selection
        return [...prev, {
          ticketTypeId: ticketType.id,
          quantity,
          ticketType
        }];
      }
    });
  };

  // Get selected quantity for a ticket type
  const getSelectedQuantity = (ticketType: TicketType): number => {
    const selected = selectedTickets.find(item => item.ticketTypeId === ticketType.id);
    return selected ? selected.quantity : 0;
  };

  // Validate selections
  const validateSelections = (): string[] => {
    const validationErrors: string[] = [];

    selectedTickets.forEach(selection => {
      const available = getAvailableQuantity(selection.ticketType);
      if (selection.quantity > available) {
        validationErrors.push(
          `Only ${available} ${selection.ticketType.name} tickets available`
        );
      }

      if (selection.ticketType.max_per_person && selection.quantity > selection.ticketType.max_per_person) {
        validationErrors.push(
          `Maximum ${selection.ticketType.max_per_person} ${selection.ticketType.name} tickets per person`
        );
      }
    });

    return validationErrors;
  };

  // Handle add to cart
  const handleAddToCart = () => {
    // Check authentication first
    if (!user) {
      setShowLogin(true);
      toast.info('Please sign in to add tickets to your cart');
      return;
    }
    
    const validationErrors = validateSelections();
    setErrors(validationErrors);

    if (validationErrors.length === 0 && selectedTickets.length > 0) {
      onAddToCart?.(selectedTickets);
    }
  };
  
  // Handle successful login
  const handleLoginSuccess = () => {
    setShowLogin(false);
    // After login, attempt to add to cart again
    const validationErrors = validateSelections();
    setErrors(validationErrors);

    if (validationErrors.length === 0 && selectedTickets.length > 0) {
      onAddToCart?.(selectedTickets);
    }
  };

  // Filter active and available ticket types
  const availableTicketTypes = ticketTypes.filter(
    ticketType => ticketType.is_active && getAvailableQuantity(ticketType) > 0
  );

  // Calculate totals
  const totalQuantity = selectedTickets.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selectedTickets.reduce(
    (sum, item) => sum + (getCurrentPrice(item.ticketType) * item.quantity),
    0
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableTicketTypes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>Ticket information for this event</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tickets are currently available for this event.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Select Tickets</CardTitle>
        <CardDescription>Choose your tickets for this event</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Ticket Types */}
        <div className="space-y-4">
          {availableTicketTypes.map((ticketType) => (
            <TicketCard
              key={ticketType.id}
              ticketType={ticketType}
              currentPrice={getCurrentPrice(ticketType)}
              isEarlyBird={isEarlyBirdActive(ticketType)}
              availableQuantity={getAvailableQuantity(ticketType)}
              selectedQuantity={getSelectedQuantity(ticketType)}
              onQuantityChange={(quantity) => handleQuantityChange(ticketType, quantity)}
            />
          ))}
        </div>

        {/* Price Summary */}
        {selectedTickets.length > 0 && (
          <div className="space-y-4">
            <hr />
            <PriceCalculator
              selectedTickets={selectedTickets}
              getCurrentPrice={getCurrentPrice}
            />
            
            {/* Add to Cart Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleAddToCart}
              disabled={totalQuantity === 0 || errors.length > 0}
              variant={!user ? "outline" : "default"}
            >
              {!user ? (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Add to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add {totalQuantity} Ticket{totalQuantity !== 1 ? 's' : ''} to Cart
                  <span className="ml-2 font-bold">${subtotal.toFixed(2)}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Login Modal */}
      <UnifiedAuthModal
        title="Sign In to Purchase Tickets"
        description="Sign in to add tickets to your cart"
        mode="modal"
        isOpen={showLogin}
        onOpenChange={setShowLogin}
        onSuccess={handleLoginSuccess}
      />
    </Card>
  );
};