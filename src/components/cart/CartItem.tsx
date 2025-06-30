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
      <CardContent className="p-3 sm:p-4">
        {/* Remove Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 sm:right-2 top-1 sm:top-2 h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-destructive/10 hover:text-destructive z-10"
          onClick={handleRemove}
        >
          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>

        <div className="space-y-2 sm:space-y-3 pr-6 sm:pr-8">
          {/* Event Title */}
          <div>
            <h4 className="font-medium text-xs sm:text-sm text-muted-foreground leading-tight">
              {item.eventTitle}
            </h4>
            <h3 className="font-semibold text-sm sm:text-base leading-tight">{item.title}</h3>
            {item.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Event Details */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
              <span className="truncate">{item.eventDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="truncate">{item.eventTime}</span>
            </div>
          </div>

          {/* Price and Early Bird Badge */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="font-semibold text-sm sm:text-base">
              ${currentPrice.toFixed(2)}
            </span>
            {isEarlyBirdActive() && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 sm:h-8 sm:w-8 p-0 touch-manipulation"
                onClick={handleQuantityDecrease}
              >
                <MinusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
              
              <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">
                {item.quantity}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 sm:h-8 sm:w-8 p-0 touch-manipulation"
                onClick={handleQuantityIncrease}
                disabled={item.quantity >= item.maxPerPerson}
              >
                <PlusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-sm sm:text-base">
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
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded leading-relaxed">
              Maximum {item.maxPerPerson} tickets per person
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};