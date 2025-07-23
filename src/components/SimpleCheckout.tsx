import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  ShoppingCart,
  Lock
} from "lucide-react";
import { PayPalLogo, CashAppLogo, CreditCardIcon } from "@/components/payment/PaymentLogos";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { productionPaymentService } from "@/lib/payments/ProductionPaymentService";
import { CheckoutAuthGuard } from "@/components/auth/CheckoutAuthGuard";
import { toast } from "sonner";

// Import the working payment components
import { SquarePaymentSimple } from "@/components/payments/SquarePaymentSimple";
import { CashAppPay } from "@/components/payment/CashAppPay";

interface SimpleCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleCheckout({ isOpen, onClose }: SimpleCheckoutProps) {
  const { items, total, subtotal, fees, clearCart } = useCart();
  const { user } = useAuth();
  
  // Use authenticated user's data
  const customerEmail = user?.email || '';
  const customerName = user?.user_metadata?.full_name || '';
  
  // Payment state
  const [selectedGateway, setSelectedGateway] = useState<string>('square');
  const [squarePaymentToken, setSquarePaymentToken] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment methods - simplified list
  const paymentMethods = [
    {
      id: 'square',
      name: 'Credit Card',
      description: 'Pay with credit or debit card',
      icon: <CreditCardIcon className="w-6 h-6" />
    },
    {
      id: 'cashapp',
      name: 'Cash App',
      description: 'Pay with Cash App',
      icon: <CashAppLogo className="h-6" />
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with PayPal account',
      icon: <PayPalLogo className="h-6" />
    }
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedGateway('square');
      setSquarePaymentToken(null);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleSquarePaymentToken = (token: string) => {
    setSquarePaymentToken(token);
    setError(null);
    console.log('✅ Payment token received:', token.substring(0, 20) + '...');
  };

  const handleSquarePaymentError = (error: string) => {
    setError(error);
    setSquarePaymentToken(null);
  };

  const handleCashAppSuccess = (result: any) => {
    console.log('✅ CashApp payment success:', result);
    toast.success("Payment successful!");
    clearCart();
    onClose();
  };

  const handleCashAppError = (error: string) => {
    setError(error);
    console.error('❌ CashApp payment error:', error);
  };

  const handleCheckout = async () => {
    if (!customerEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!customerName) {
      setError("Please enter your full name");
      return;
    }

    if (selectedGateway === 'square' && !squarePaymentToken) {
      setError("Please complete the payment form first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const orderId = `order_${Date.now()}_${user?.id || 'guest'}`;
      
      const paymentData = {
        amount: Math.round(total * 100), // Convert to cents
        gateway: selectedGateway,
        orderId,
        customerEmail,
        ...(selectedGateway === 'square' && squarePaymentToken && {
          sourceId: squarePaymentToken
        })
      };

      console.log('Processing payment:', { ...paymentData, sourceId: paymentData.sourceId?.substring(0, 20) + '...' });

      const result = await productionPaymentService.processPayment(paymentData);

      if (result.success) {
        // Handle PayPal redirect
        if (result.requiresAction && result.action === 'approve_paypal_order') {
          sessionStorage.setItem('pendingPayPalOrder', JSON.stringify({
            paypalOrderId: result.data.paypalOrderId,
            orderId,
            customerEmail,
            customerName,
            amount: Math.round(total * 100),
            items
          }));
          
          if (result.data.approvalUrl) {
            window.location.href = result.data.approvalUrl;
            return;
          }
        }
        
        // Payment completed successfully
        toast.success("Payment successful! Your tickets are being processed.");
        clearCart();
        onClose();
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Authentication Required</DialogTitle>
          <CheckoutAuthGuard
            itemCount={items.length}
            totalAmount={total}
            onAuthenticated={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (items.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Your cart is empty</DialogTitle>
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">Add some tickets to continue with checkout</p>
            <Button onClick={onClose}>Browse Events</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Checkout
          </DialogTitle>
          <DialogDescription>
            Complete your ticket purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
              <CardDescription>{items.length} item{items.length !== 1 ? 's' : ''} in cart</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.eventTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.eventDate} at {item.eventTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      Qty: {item.quantity}
                    </Badge>
                    <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing Fee:</span>
                  <span>${fees.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedGateway === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedGateway(method.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {method.icon}
                        <div>
                          <h4 className="font-medium">{method.name}</h4>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedGateway === method.id
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Square Payment Form */}
          {selectedGateway === 'square' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Card Details
                </CardTitle>
                <CardDescription>
                  Your payment information is secured with SSL encryption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SquarePaymentSimple
                  amount={total}
                  onPaymentToken={handleSquarePaymentToken}
                  onError={handleSquarePaymentError}
                  isProcessing={isProcessing}
                  showHeader={false}
                />
              </CardContent>
            </Card>
          )}

          {/* CashApp Payment */}
          {selectedGateway === 'cashapp' && (
            <Card>
              <CardHeader>
                <CardTitle>Cash App Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <CashAppPay
                  amount={total}
                  orderId={`order_${Date.now()}`}
                  customerEmail={customerEmail}
                  onSuccess={handleCashAppSuccess}
                  onError={handleCashAppError}
                />
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            
            {selectedGateway !== 'cashapp' && (
              <Button 
                onClick={handleCheckout} 
                disabled={
                  isProcessing || 
                  !customerEmail || 
                  !customerName ||
                  (selectedGateway === 'square' && !squarePaymentToken)
                }
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Complete Purchase - ${total.toFixed(2)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}