import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartItem as CartItemComponent } from './CartItem';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, X, CreditCard, LogIn } from 'lucide-react';
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal';
import { SlideOutCashAppPay } from './SlideOutCashAppPay';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { paymentManager } from '@/lib/services/paymentManager';

interface CartDrawerWithPaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartDrawerWithPayment = ({ open, onOpenChange }: CartDrawerWithPaymentProps) => {
  const { items, totalItems, subtotal, fees, total, clearCart, openCheckoutWithProps } = useCart();
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showInCartPayment, setShowInCartPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'checkout' | 'cashapp'>('checkout');

  // Initialize payment manager when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      paymentManager.initializeSquarePayments().catch(console.error);
    }
  }, []);

  const handleCheckout = () => {
    if (!user) {
      setShowLogin(true);
      toast.info('Please sign in to complete your purchase');
    } else {
      if (selectedPaymentMethod === 'cashapp') {
        setShowInCartPayment(true);
      } else {
        onOpenChange(false);
        openCheckoutWithProps({});
      }
    }
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    localStorage.setItem('checkoutIntent', 'true');
    
    if (selectedPaymentMethod === 'cashapp') {
      setShowInCartPayment(true);
    } else {
      onOpenChange(false);
      openCheckoutWithProps({});
    }
  };

  const handleClearCart = () => {
    clearCart();
    setShowInCartPayment(false);
  };

  const handleCashAppSuccess = (result: any) => {
    console.log('Cash App payment successful:', result);
    toast.success('Payment successful! Your tickets have been purchased.');
    clearCart();
    setShowInCartPayment(false);
    onOpenChange(false);
  };

  const handleCashAppError = (error: string) => {
    console.error('Cash App payment error:', error);
    toast.error(error);
    setShowInCartPayment(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-full sm:max-w-md md:max-w-lg flex flex-col h-full">
          <SheetHeader className="flex-shrink-0 pb-3 sm:pb-4">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              Your Cart
              {totalItems > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {totalItems} item{totalItems !== 1 ? 's' : ''}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              {totalItems === 0 
                ? "Your cart is empty. Add some tickets to get started!" 
                : "Review your ticket selections and proceed to checkout."
              }
            </SheetDescription>
          </SheetHeader>

          {totalItems === 0 ? (
            /* Empty Cart State */
            <div className="flex flex-col items-center justify-center flex-1 py-8 sm:py-12 px-4 text-center min-h-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-xs leading-relaxed">
                Browse events and add tickets to your cart to get started.
              </p>
              <Button onClick={() => onOpenChange(false)} variant="outline" size="sm" className="text-sm">
                Continue Browsing
              </Button>
            </div>
          ) : (
            /* Cart with Items */
            <div className="flex flex-col h-full min-h-0 flex-1">
              {/* Show payment UI if in-cart payment is active */}
              {showInCartPayment ? (
                <div className="flex-1 overflow-y-auto px-4 py-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Complete Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SlideOutCashAppPay
                        amount={total}
                        orderId={`cart-order-${Date.now()}`}
                        customerEmail={user?.email || ''}
                        isOpen={showInCartPayment}
                        onSuccess={handleCashAppSuccess}
                        onError={handleCashAppError}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => setShowInCartPayment(false)}
                      >
                        Back to Cart
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
                    <div className="space-y-3 sm:space-y-4 py-4 sm:py-6">
                      {items.map((item) => (
                        <CartItemComponent key={item.id} item={item} />
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Cart Summary */}
                  <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6 space-y-3 sm:space-y-4 flex-shrink-0">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                        <span>Processing fees</span>
                        <span>${fees.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-base sm:text-lg">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Payment Method:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={selectedPaymentMethod === 'checkout' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedPaymentMethod('checkout')}
                          className="text-xs"
                        >
                          Standard Checkout
                        </Button>
                        <Button
                          variant={selectedPaymentMethod === 'cashapp' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedPaymentMethod('cashapp')}
                          className="text-xs"
                        >
                          Cash App Pay
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-3">
                      <Button 
                        className="w-full text-sm sm:text-base h-10 sm:h-11" 
                        onClick={handleCheckout}
                        variant={!user ? "outline" : "default"}
                      >
                        {!user ? (
                          <>
                            <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Sign In to Checkout
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            {selectedPaymentMethod === 'cashapp' ? 'Pay with Cash App' : 'Proceed to Checkout'}
                          </>
                        )}
                      </Button>
                      
                      <div className="flex gap-1 sm:gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                          onClick={() => onOpenChange(false)}
                        >
                          Continue Shopping
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                          onClick={handleClearCart}
                        >
                          Clear Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Login Modal */}
      <UnifiedAuthModal
        title="Sign In to Complete Purchase"
        description="Sign in to continue with your payment"
        mode="modal"
        isOpen={showLogin}
        onOpenChange={setShowLogin}
        onSuccess={handleLoginSuccess}
        redirectPath="/checkout"
      />
    </>
  );
};