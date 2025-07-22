// ==========================================
// MODERN CHECKOUT UI - PRODUCTION
// ==========================================

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, CreditCard, Smartphone, Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { SquareCardPayment } from '@/components/payment/production/SquareCardPayment';
import { CashAppPayComponent } from '@/components/payment/production/CashAppPayComponent';
import { PayPalPayment } from '@/components/payment/production/PayPalPayment';
import { PayPalLogo, CashAppLogo } from '@/components/payment/PaymentLogos';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CheckoutAuthGuard } from '@/components/auth/CheckoutAuthGuard';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  selectedSeats?: any[];
  seatDetails?: any;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
}

export function CheckoutModal({ 
  isOpen, 
  onClose, 
  eventId, 
  selectedSeats, 
  seatDetails,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation
}: CheckoutModalProps) {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cashapp' | 'paypal'>('card');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Calculate totals
  const calculateTotals = () => {
    if (seatDetails) {
      const subtotal = seatDetails.reduce((sum: number, seat: any) => sum + seat.price, 0);
      const processingFee = Math.max(subtotal * 0.03, 150);
      const serviceFee = seatDetails.length * 200;
      const total = subtotal + processingFee + serviceFee;
      return { subtotal, processingFee, serviceFee, total, tax: 0 };
    } else {
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const processingFee = Math.max(subtotal * 0.03, 150);
      const tax = Math.round(subtotal * 0.08); // 8% tax
      const total = subtotal + processingFee + tax;
      return { subtotal, processingFee, serviceFee: 0, total, tax };
    }
  };

  const { subtotal, processingFee, serviceFee, total, tax } = calculateTotals();

  const createProductionOrder = async () => {
    if (!user) {
      throw new Error('Please login to checkout');
    }

    setIsCreatingOrder(true);
    setError(null);

    try {
      const orderData = {
        user_id: user.id,
        order_status: 'pending',
        payment_status: 'pending',
        total_amount: Math.round(total),
        subtotal: Math.round(subtotal),
        processing_fee: Math.round(processingFee),
        service_fee: Math.round(serviceFee),
        tax_amount: Math.round(tax),
        currency: 'USD',
        customer_email: user.email || '',
        customer_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        metadata: {
          environment: 'production',
          created_from: 'web',
          event_id: eventId,
          seat_checkout: !!seatDetails,
          seats: seatDetails || [],
          items: seatDetails ? [] : items
        }
      };

      const { data, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      if (!seatDetails && items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: data.id,
          ticket_type_id: item.id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      setCurrentOrder(data);
      console.log('[Checkout] Production order created:', data.id);
      
    } catch (error: any) {
      console.error('[Checkout] Order creation error:', error);
      setError(error.message || 'Failed to create order');
      throw error;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, method: string) => {
    if (!currentOrder) return;

    setIsProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_id: paymentId,
          payment_gateway: method,
          payment_status: 'completed',
          order_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrder.id);

      if (updateError) throw updateError;

      if (!seatDetails) {
        clearCart();
      }
      
      setPaymentSuccess(true);
      console.log('[Checkout] Production payment completed:', paymentId);
      
      // Redirect after showing success
      setTimeout(() => {
        onClose();
        window.location.href = `/order-success?orderId=${currentOrder.id}`;
      }, 2000);
      
    } catch (error: any) {
      console.error('[Checkout] Failed to update order:', error);
      setError('Payment successful but order update failed. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    setIsProcessing(false);
    console.error('[Checkout] Payment error:', error);
  };

  useEffect(() => {
    if (isOpen && !currentOrder && user) {
      createProductionOrder();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-0 overflow-hidden">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Complete Your Purchase
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 text-green-600" />
              <span>Secure Checkout</span>
            </div>
          </div>

          {/* Show auth guard if user is not authenticated */}
          {!user ? (
            <CheckoutAuthGuard 
              itemCount={seatDetails ? seatDetails.length : items.length}
              totalAmount={total / 100}
              onAuthenticated={() => {
                // The modal will re-render with authenticated user
              }}
            />
          ) : (
            <>
              {/* Order Summary */}
              <div className="bg-card rounded-xl border p-6 mb-6">
                <h2 className="text-base font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  {seatDetails ? (
                    <>
                      {seatDetails.map((seat: any) => (
                        <div key={seat.id} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                          <span className="text-sm text-muted-foreground">
                            Table {seat.tableNumber}, Seat {seat.seatNumber}
                          </span>
                          <span className="text-sm font-medium">${(seat.price / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                          <span className="text-sm text-muted-foreground">
                            {item.title} x {item.quantity}
                          </span>
                          <span className="text-sm font-medium">
                            ${((item.price * item.quantity) / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  
                  <div className="flex justify-between items-center py-3 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Processing Fee</span>
                    <span className="text-sm font-medium">${(processingFee / 100).toFixed(2)}</span>
                  </div>
                  
                  {tax > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Tax</span>
                      <span className="text-sm font-medium">${(tax / 100).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {serviceFee > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Service Fee</span>
                      <span className="text-sm font-medium">${(serviceFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-3 border-t-2 border-border">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-lg font-semibold">${(total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {currentOrder && !paymentSuccess && (
                <>
                  {/* Payment Methods */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-5">Select Payment Method</h3>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setSelectedMethod('card')}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer min-h-[80px]",
                          "hover:border-muted-foreground/50 hover:shadow-sm",
                          selectedMethod === 'card' 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border bg-card"
                        )}
                      >
                        {selectedMethod === 'card' && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                        <CreditCard className="w-8 h-8 text-foreground" />
                        <span className="text-sm font-medium">Card</span>
                      </button>

                      <button
                        onClick={() => setSelectedMethod('cashapp')}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer min-h-[80px]",
                          "hover:border-muted-foreground/50 hover:shadow-sm",
                          selectedMethod === 'cashapp' 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border bg-card"
                        )}
                      >
                        {selectedMethod === 'cashapp' && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                        <CashAppLogo className="h-8" />
                        <span className="text-sm font-medium">Cash App</span>
                      </button>

                      <button
                        onClick={() => setSelectedMethod('paypal')}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer min-h-[80px]",
                          "hover:border-muted-foreground/50 hover:shadow-sm",
                          selectedMethod === 'paypal' 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border bg-card"
                        )}
                      >
                        {selectedMethod === 'paypal' && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                        <PayPalLogo className="h-6" />
                        <span className="text-sm font-medium">PayPal</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Forms */}
                  <div className="space-y-6">
                    {selectedMethod === 'card' && (
                      <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                        <SquareCardPayment
                          amount={total}
                          orderId={currentOrder.id}
                          onSuccess={(paymentId) => handlePaymentSuccess(paymentId, 'square')}
                          onError={handlePaymentError}
                        />
                      </div>
                    )}
                    
                    {selectedMethod === 'cashapp' && (
                      <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                        <CashAppPayComponent
                          amount={total}
                          orderId={currentOrder.id}
                          onSuccess={(paymentId) => handlePaymentSuccess(paymentId, 'cashapp')}
                          onError={handlePaymentError}
                        />
                        <p className="text-center text-sm text-muted-foreground mt-3">
                          Click the Cash App button above to complete payment
                        </p>
                      </div>
                    )}
                    
                    {selectedMethod === 'paypal' && (
                      <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                        <PayPalPayment
                          amount={total}
                          orderId={currentOrder.id}
                          onSuccess={(paymentId) => handlePaymentSuccess(paymentId, 'paypal')}
                          onError={handlePaymentError}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Status Messages */}
              {error && (
                <Alert variant="destructive" className="mt-6 animate-in fade-in-0 slide-in-from-top-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {paymentSuccess && (
                <Alert className="mt-6 border-green-200 bg-green-50 text-green-800 animate-in fade-in-0 slide-in-from-top-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Payment successful! Order confirmed. Redirecting...
                  </AlertDescription>
                </Alert>
              )}

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 mt-8 pt-8 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-5 h-5" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="w-5 h-5" />
                  <span>PCI Compliant</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Loading Overlay */}
        {(isCreatingOrder || isProcessing) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card p-8 rounded-xl shadow-lg text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                {isCreatingOrder ? 'Creating your order...' : 'Processing your payment...'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}