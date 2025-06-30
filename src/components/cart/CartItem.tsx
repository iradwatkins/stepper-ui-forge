import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MinusIcon, PlusIcon, X, Calendar, MapPin } from 'lucide-react';
import { useCart, CartItem as CartItemType } from '@/contexts/CartContext';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem = ({ item }: CartItemProps) => {
  const { updateQuantity, removeItem } = useCart();

  // Get current effective price (early bird if applicable)
  const getCurrentPrice = (): number => {
    if (item.earlyBirdPrice && item.earlyBirdUntil) {
      const now = new Date();
      const earlyBirdEnd = new Date(item.earlyBirdUntil);
      return now <= earlyBirdEnd ? item.earlyBirdPrice : item.price;
    }
    return item.price;
  };

  // Check if early bird pricing is active
  const isEarlyBirdActive = (): boolean => {
    if (!item.earlyBirdPrice || !item.earlyBirdUntil) {
      return false;
    }
    const now = new Date();
    const earlyBirdEnd = new Date(item.earlyBirdUntil);
    return now <= earlyBirdEnd;
  };

  const currentPrice = getCurrentPrice();
  const itemTotal = currentPrice * item.quantity;

  const handleQuantityDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      removeItem(item.id);
    }
  };

  const handleQuantityIncrease = () => {
    if (item.quantity < item.maxPerPerson) {
      updateQuantity(item.id, item.quantity + 1);
    }
  };

  const handleRemove = () => {
    removeItem(item.id);
  };

  return (
    <Card className="relative">
      <CardContent className="p-4">
        {/* Remove Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRemove}
        >
          <X className="h-3 w-3" />
        </Button>

        <div className="space-y-3">
          {/* Event Title */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">
              {item.eventTitle}
            </h4>
            <h3 className="font-semibold">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {item.description}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{item.eventDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{item.eventTime}</span>
            </div>
          </div>

          {/* Price and Early Bird Badge */}
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              ${currentPrice.toFixed(2)}
            </span>
            {isEarlyBirdActive() && (
              <Badge variant="secondary" className="text-xs">
                Early Bird
              </Badge>
            )}
            {item.price !== currentPrice && (
              <span className="text-xs text-muted-foreground line-through">
                ${item.price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Quantity Controls and Total */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleQuantityDecrease}
              >
                <MinusIcon className="h-3 w-3" />
              </Button>
              
              <span className="w-8 text-center text-sm font-medium">
                {item.quantity}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleQuantityIncrease}
                disabled={item.quantity >= item.maxPerPerson}
              >
                <PlusIcon className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="text-right">
              <div className="font-semibold">
                ${itemTotal.toFixed(2)}
              </div>
              {item.quantity > 1 && (
                <div className="text-xs text-muted-foreground">
                  ${currentPrice.toFixed(2)} each
                </div>
              )}
            </div>
          </div>

          {/* Max per person warning */}
          {item.quantity >= item.maxPerPerson && item.maxPerPerson > 1 && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              Maximum {item.maxPerPerson} tickets per person
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};