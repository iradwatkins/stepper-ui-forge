// ==========================================
// UNIFIED CHECKOUT - PRODUCTION ONLY
// ==========================================

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, ShoppingCart, CreditCard, Smartphone, Shield, Check } from 'lucide-react';
import { SquareCardPayment } from './SquareCardPayment';
import { CashAppPayComponent } from './CashAppPayComponent';
import { PayPalPayment } from './PayPalPayment';
import { PayPalLogo, CashAppLogo } from '@/components/payment/PaymentLogos';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProductionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  selectedSeats?: any[];
  seatDetails?: any;
}

export const ProductionCheckoutModal: React.FC<ProductionCheckoutModalProps> = ({
  isOpen,
  onClose,
  eventId,
  selectedSeats,
  seatDetails
}) => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cashapp' | 'paypal'>('card');
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const calculateTotals = () => {
    if (seatDetails) {
      // Seat-based checkout
      const subtotal = seatDetails.reduce((sum: number, seat: any) => sum + seat.price, 0);
      const processingFee = Math.max(subtotal * 0.03, 150); // 3% or $1.50 minimum
      const serviceFee = seatDetails.length * 200; // $2 per seat
      const total = subtotal + processingFee + serviceFee;
      return { subtotal, processingFee, serviceFee, total };
    } else {
      // Cart-based checkout
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const processingFee = Math.max(subtotal * 0.03, 150); // 3% or $1.50 minimum
      const total = subtotal + processingFee;
      return { subtotal, processingFee, serviceFee: 0, total };
    }
  };

  const { subtotal, processingFee, serviceFee, total } = calculateTotals();

  const createProductionOrder = async () => {
    if (!user) {
      throw new Error('Please login to checkout');
    }

    setIsCreatingOrder(true);
    setError(null);

    try {
      // Prepare order data
      const orderData = {
        user_id: user.id,
        order_status: 'pending',
        payment_status: 'pending',
        total_amount: Math.round(total),
        subtotal: Math.round(subtotal),
        processing_fee: Math.round(processingFee),
        service_fee: Math.round(serviceFee),
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

      // Create order in database
      const { data, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items if cart-based checkout
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

    try {
      // Update production order
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

      // Clear cart
      if (!seatDetails) {
        clearCart();
      }
      
      console.log('[Checkout] Production payment completed:', paymentId);
      
      // Close modal and redirect
      onClose();
      window.location.href = `/order-success?orderId=${currentOrder.id}`;
      
    } catch (error: any) {
      console.error('[Checkout] Failed to update order:', error);
      setError('Payment successful but order update failed. Please contact support.');
    }
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    console.error('[Checkout] Payment error:', error);
  };

  const startCheckout = async () => {
    if (!user) {
      setError('Please login to continue');
      return;
    }

    try {
      await createProductionOrder();
    } catch (error) {
      // Error already handled in createProductionOrder
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            Secure Production Checkout
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Complete your purchase with our secure payment system
          </DialogDescription>
        </DialogHeader>

        {!currentOrder ? (
          <div className="space-y-6 py-4">
            {/* Production Warning */}
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>PRODUCTION MODE</strong> - Real payments will be processed
              </AlertDescription>
            </Alert>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
              
              {seatDetails ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {seatDetails.length} seat{seatDetails.length !== 1 ? 's' : ''} selected
                  </div>
                  {seatDetails.map((seat: any) => (
                    <div key={seat.id} className="flex justify-between items-center">
                      <span className="text-sm">
                        Table {seat.tableNumber}, Seat {seat.seatNumber}
                      </span>
                      <span className="font-medium">${(seat.price / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm">
                        {item.title} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>${(processingFee / 100).toFixed(2)}</span>
                </div>
                {serviceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>${(serviceFee / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      ${(total / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Secure Checkout</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-primary" />
                <span>Production Ready</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={startCheckout} 
              disabled={isCreatingOrder || (items.length === 0 && !seatDetails)}
              className="w-full"
              size="lg"
            >
              {isCreatingOrder ? 'Creating order...' : 'Proceed to Payment'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Order Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono font-semibold">{currentOrder.id}</p>
              <p className="text-lg font-semibold mt-2">
                Total: ${(currentOrder.total_amount / 100).toFixed(2)}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Select Payment Method</h3>
              <RadioGroup value={selectedMethod} onValueChange={(value: any) => setSelectedMethod(value)}>
                <div className="space-y-2">
                  <Label 
                    htmlFor="card" 
                    className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50"
                  >
                    <RadioGroupItem value="card" id="card" />
                    <CreditCard className="h-5 w-5" />
                    <span className="flex-1 font-medium">Credit or Debit Card</span>
                  </Label>
                  
                  <Label 
                    htmlFor="cashapp" 
                    className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50"
                  >
                    <RadioGroupItem value="cashapp" id="cashapp" />
                    <CashAppLogo className="h-6" />
                    <span className="flex-1 font-medium">Cash App</span>
                  </Label>
                  
                  <Label 
                    htmlFor="paypal" 
                    className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50"
                  >
                    <RadioGroupItem value="paypal" id="paypal" />
                    <PayPalLogo className="h-5" />
                    <span className="flex-1 font-medium">PayPal</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Component */}
            <div className="border-t pt-6">
              {selectedMethod === 'card' && (
                <SquareCardPayment
                  amount={currentOrder.total_amount}
                  orderId={currentOrder.id}
                  onSuccess={(paymentId) => handlePaymentSuccess(paymentId, 'square')}
                  onError={handlePaymentError}
                />
              )}
              {selectedMethod === 'cashapp' && (
                <CashAppPayComponent
                  amount={currentOrder.total_amount}
                  orderId={currentOrder.id}
                  onSuccess={(paymentId) => handlePaymentSuccess(paymentId, 'cashapp')}
                  onError={handlePaymentError}
                />
              )}
              {selectedMethod === 'paypal' && (
                <PayPalPayment
                  amount={currentOrder.total_amount}
                  orderId={currentOrder.id}
                  onSuccess={(paymentId) => handlePaymentSuccess(paymentId, 'paypal')}
                  onError={handlePaymentError}
                />
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};