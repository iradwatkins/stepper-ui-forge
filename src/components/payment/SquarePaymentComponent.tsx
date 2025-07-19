import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Loader2, AlertCircle, Shield } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
    CashAppPay: any;
  }
}

interface SquarePaymentComponentProps {
  amount: number;
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export function SquarePaymentComponent({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false 
}: SquarePaymentComponentProps) {
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

      // Get environment variables from Vite
      const squareApplicationId = import.meta.env.VITE_SQUARE_APP_ID;
      const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
      const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const cashAppClientId = import.meta.env.VITE_CASHAPP_CLIENT_ID;
      const cashAppEnvironment = import.meta.env.VITE_CASHAPP_ENVIRONMENT || 'sandbox';

      console.log('🔧 Initializing Square with Vite Environment Variables:');
      console.log('VITE_SQUARE_APP_ID:', squareApplicationId);
      console.log('VITE_SQUARE_ENVIRONMENT:', squareEnvironment);
      console.log('VITE_SQUARE_LOCATION_ID:', squareLocationId);
      console.log('VITE_CASHAPP_CLIENT_ID:', cashAppClientId);
      console.log('VITE_CASHAPP_ENVIRONMENT:', cashAppEnvironment);

      // Validate required environment variables
      if (!squareApplicationId || squareApplicationId.includes('XXXXX')) {
        throw new Error('Square Application ID not configured. Please set VITE_SQUARE_APP_ID in your environment variables.');
      }

      if (!squareLocationId || squareLocationId.includes('XXXXX')) {
        throw new Error('Square Location ID not configured. Please set VITE_SQUARE_LOCATION_ID in your environment variables.');
      }

      // Dynamic Square SDK URL based on environment
      const squareSdkUrl = squareEnvironment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      console.log('📦 Loading Square SDK from:', squareSdkUrl);

      // Load Square SDK if not already loaded
      if (!window.Square) {
        await loadSquareSDK(squareSdkUrl);
      }

      // Initialize Square payments
      const payments = window.Square.payments(squareApplicationId, squareLocationId);
      
      // Create card payment method
      const card = await payments.card();
      await card.attach('#square-card-container');

      // Try to create Cash App Pay with environment configuration
      let cashAppPay;
      try {
        if (cashAppClientId) {
          cashAppPay = await payments.cashAppPay({
            redirectURL: window.location.origin,
            referenceId: `cashapp-${Date.now()}`,
            // Explicitly pass environment to Cash App Pay
            environment: cashAppEnvironment
          });
          setCashAppAvailable(true);
          console.log(`✅ Cash App Pay initialized (${cashAppEnvironment})`);
        } else {
          console.warn('Cash App Pay disabled - VITE_CASHAPP_CLIENT_ID not configured');
        }
      } catch (cashAppError) {
        console.warn('Cash App Pay not available:', cashAppError);
      }

      setPaymentMethods({ payments, card, cashAppPay });
      setIsLoading(false);

      console.log('✅ Square payment methods initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Square payments';
      console.error('Square initialization error:', err);
      setError(errorMessage);
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  const loadSquareSDK = (scriptUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.Square) {
          console.log('✅ Square Web SDK loaded successfully');
          resolve();
        } else {
          reject(new Error('Square SDK loaded but Square object not available'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load Square Web SDK'));
      };

      document.head.appendChild(script);
    });
  };

  const handleCardPayment = async () => {
    try {
      if (!paymentMethods.card) {
        throw new Error('Card payment method not initialized');
      }

      const tokenResult = await paymentMethods.card.tokenize();
      
      if (tokenResult.status === 'OK') {
        onPaymentToken(tokenResult.token, 'card');
      } else {
        throw new Error(`Card tokenization failed: ${tokenResult.errors?.[0]?.message || 'Unknown error'}`);
      }
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

  const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

  return (
    <div className="space-y-4">
      {/* Environment Badge */}
      <div className="flex justify-center">
        <Badge variant={squareEnvironment === 'production' ? 'default' : 'secondary'} className="text-xs">
          <Shield className="w-3 h-3 mr-1" />
          {squareEnvironment === 'production' ? 'LIVE PAYMENTS' : 'TEST MODE'}
        </Badge>
      </div>

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
        Powered by Square • PCI DSS Compliant • {squareEnvironment.toUpperCase()} Mode
      </div>
    </div>
  );
}