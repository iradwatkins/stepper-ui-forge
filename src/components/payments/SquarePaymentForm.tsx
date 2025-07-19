import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { createSquarePaymentForm, tokenizePayment } from '@/lib/payments/square-sdk';
import { getPaymentConfig } from '@/lib/payment-config';

interface SquarePaymentFormProps {
  amount: number;
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
  customerEmail?: string;
}

export function SquarePaymentForm({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false,
  customerEmail 
}: SquarePaymentFormProps) {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<{
    card?: any;
    cashAppPay?: any;
    payments?: any;
  }>({});
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cashapp'>('card');
  const [error, setError] = useState<string | null>(null);
  const [cashAppAvailable, setCashAppAvailable] = useState(false);

  useEffect(() => {
    initializeSquarePayments();
  }, []);

  const initializeSquarePayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const squareConfig = getPaymentConfig().square;
      if (!squareConfig.applicationId) {
        throw new Error('Square Application ID not configured');
      }

      if (!squareConfig.locationId) {
        throw new Error('Square Location ID not configured');
      }

      const result = await createSquarePaymentForm(
        squareConfig.applicationId,
        squareConfig.locationId,
        'square-card-container'
      );

      setPaymentMethods(result);
      
      // Check if Cash App Pay is available
      if (result.cashAppPay) {
        setCashAppAvailable(true);
        console.log('✅ Cash App Pay is available');
      } else {
        console.log('ℹ️ Cash App Pay not available in this environment');
      }

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Square payments';
      console.error('Square initialization error:', err);
      setError(errorMessage);
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCardPayment = async () => {
    try {
      if (!paymentMethods.card) {
        throw new Error('Card payment method not initialized');
      }

      const token = await tokenizePayment(paymentMethods.card);
      onPaymentToken(token, 'card');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Card tokenization failed';
      console.error('Card payment error:', err);
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleCashAppPayment = async () => {
    try {
      if (!paymentMethods.cashAppPay) {
        throw new Error('Cash App Pay not available');
      }

      // For Cash App Pay, we need to start the payment flow
      const paymentRequest = paymentMethods.cashAppPay.requestPayment({
        amount: {
          amount: Math.round(amount * 100), // Convert to cents
          currencyCode: 'USD'
        }
      });

      const paymentResult = await paymentRequest;
      
      if (paymentResult.status === 'OK') {
        onPaymentToken(paymentResult.token, 'cashapp');
      } else {
        throw new Error(paymentResult.errors?.[0]?.message || 'Cash App payment failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cash App payment failed';
      console.error('Cash App payment error:', err);
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (selectedMethod === 'card') {
      await handleCardPayment();
    } else if (selectedMethod === 'cashapp') {
      await handleCashAppPayment();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading Square payment form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !paymentMethods.card) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment Method Selection */}
      <div className="grid gap-3">
        <div
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'card'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setSelectedMethod('card')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              <div>
                <div className="font-medium">Credit or Debit Card</div>
                <div className="text-sm text-muted-foreground">
                  Pay securely with your card
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs">Visa</Badge>
              <Badge variant="outline" className="text-xs">MC</Badge>
              <Badge variant="outline" className="text-xs">Amex</Badge>
            </div>
          </div>
        </div>

        {cashAppAvailable && (
          <div
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedMethod === 'cashapp'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedMethod('cashapp')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5" />
                <div>
                  <div className="font-medium">Cash App Pay</div>
                  <div className="text-sm text-muted-foreground">
                    Pay with your Cash App balance
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Instant
              </Badge>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Payment Form */}
      {selectedMethod === 'card' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Card Information
            </CardTitle>
            <CardDescription>
              Enter your card details below. All information is encrypted and secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Square Card Container */}
              <div 
                ref={cardContainerRef}
                id="square-card-container"
                className="border rounded-lg p-4 min-h-[60px] bg-background"
              />
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Your payment information is encrypted and secure</p>
                <p>• We use Square's PCI-compliant payment processing</p>
                <p>• Your card details are never stored on our servers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === 'cashapp' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Cash App Pay
            </CardTitle>
            <CardDescription>
              You'll be redirected to Cash App to complete your payment of ${amount.toFixed(2)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-medium">Ready to pay with Cash App</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Click "Pay Now" to open Cash App and complete your payment.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Button */}
      <Button 
        onClick={handleSubmit}
        disabled={isProcessing || isLoading}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {selectedMethod === 'card' ? (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${amount.toFixed(2)} with Card
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Pay ${amount.toFixed(2)} with Cash App
              </>
            )}
          </>
        )}
      </Button>

      <div className="text-center text-xs text-muted-foreground">
        Powered by Square • PCI DSS Compliant
      </div>
    </div>
  );
}