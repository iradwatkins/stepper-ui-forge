import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartItem as CartItemComponent } from './CartItem';
import { useCart } from '@/contexts/CartContext';
import { ShoppingBag, X, CreditCard } from 'lucide-react';
import CheckoutModal from '@/components/CheckoutModal';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { items, totalItems, subtotal, fees, total, clearCart } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const handleCheckout = () => {
    onOpenChange(false); // Close drawer
    setIsCheckoutOpen(true); // Open checkout modal
  };

  const handleClearCart = () => {
    clearCart();
  };

  // Create mock event data for checkout modal (simplified for now)
  const checkoutEvent = items.length > 0 ? {
    id: parseInt(items[0].eventId) || 1,
    title: items.length > 1 ? `${items.length} Events` : items[0].eventTitle,
    date: items[0].eventDate,
    time: items[0].eventTime,
    price: total
  } : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Your Cart
              {totalItems > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalItems} item{totalItems !== 1 ? 's' : ''}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {totalItems === 0 
                ? "Your cart is empty. Add some tickets to get started!" 
                : "Review your ticket selections and proceed to checkout."
              }
            </SheetDescription>
          </SheetHeader>

          {totalItems === 0 ? (
            /* Empty Cart State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Browse events and add tickets to your cart to get started.
              </p>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Continue Browsing
              </Button>
            </div>
          ) : (
            /* Cart with Items */
            <div className="flex flex-col h-full">
              {/* Cart Items */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-6">
                  {items.map((item) => (
                    <CartItemComponent key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>

              {/* Cart Summary */}
              <div className="border-t pt-6 mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Processing fees</span>
                    <span>${fees.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCheckout}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                    >
                      Continue Shopping
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={handleClearCart}
                    >
                      Clear Cart
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout Modal */}
      {checkoutEvent && (
        <CheckoutModal 
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          event={checkoutEvent}
        />
      )}
    </>
  );
};