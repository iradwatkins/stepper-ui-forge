import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Loader2, AlertCircle, Shield } from 'lucide-react';
import { tokenizePayment } from '@/lib/payments/square-sdk';
import { getPaymentConfig } from '@/lib/payment-config';
import { CashAppLogo } from '@/components/payment/PaymentLogos';

interface SquarePaymentFormFixedProps {
  amount: number;
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
  customerEmail?: string;
}

declare global {
  interface Window {
    Square: any;
  }
}

export function SquarePaymentFormFixed({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false,
  customerEmail 
}: SquarePaymentFormFixedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cardInstance, setCardInstance] = useState<any>(null);
  const [cashAppInstance, setCashAppInstance] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cashapp'>('card');
  const [error, setError] = useState<string | null>(null);
  const [cashAppAvailable, setCashAppAvailable] = useState(false);
  const initStartedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const loadSquare = async () => {
      console.log('[SquareFixed] Starting Square initialization');
      
      try {
        // Load Square SDK if not already loaded
        if (!window.Square) {
          console.log('[SquareFixed] Loading Square SDK...');
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://web.squarecdn.com/v1/square.js';
            script.onload = () => {
              console.log('[SquareFixed] Square SDK loaded');
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Square SDK'));
            document.head.appendChild(script);
          });
        }

        // Initialize Square payments
        const config = getPaymentConfig();
        console.log('[SquareFixed] Initializing Square with config:', {
          appId: config.square.applicationId.substring(0, 15) + '...',
          environment: config.square.environment
        });

        const payments = window.Square.payments(
          config.square.applicationId,
          config.square.locationId
        );

        // Create card payment method
        console.log('[SquareFixed] Creating card payment method...');
        const card = await payments.card();
        setCardInstance(card);

        // Create container and attach card
        const container = document.createElement('div');
        container.id = 'square-card-fixed';
        container.style.minHeight = '100px';
        
        // Find mount point
        const mountPoint = document.getElementById('square-card-mount');
        if (mountPoint) {
          mountPoint.innerHTML = '';
          mountPoint.appendChild(container);
          
          await card.attach('#square-card-fixed');
          console.log('[SquareFixed] Card attached successfully');
        }

        // Try to create Cash App Pay
        try {
          const cashApp = await payments.cashAppPay();
          setCashAppInstance(cashApp);
          setCashAppAvailable(true);
          console.log('[SquareFixed] Cash App Pay available');
        } catch (e) {
          console.log('[SquareFixed] Cash App Pay not available:', e);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[SquareFixed] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment form');
        setIsLoading(false);
      }
    };

    loadSquare();
  }, []);

  const handleCardPayment = async () => {
    try {
      if (!cardInstance) {
        throw new Error('Card payment method not initialized');
      }

      const result = await cardInstance.tokenize();
      
      if (result.status === 'OK') {
        onPaymentToken(result.token, 'card');
      } else {
        throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Card payment failed';
      console.error('[SquareFixed] Card payment error:', err);
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleCashAppPayment = async () => {
    try {
      if (!cashAppInstance) {
        throw new Error('Cash App Pay not available');
      }

      const paymentRequest = cashAppInstance.requestPayment({
        amount: {
          amount: amount.toFixed(2),
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
      console.error('[SquareFixed] Cash App payment error:', err);
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
            <span>Loading payment form...</span>
          </div>
        </CardContent>
      </Card>
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
                <CashAppLogo className="w-5 h-5" />
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Card Information
              </div>
              <Badge variant={getPaymentConfig().square.environment === 'production' ? 'default' : 'secondary'} className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                {getPaymentConfig().square.environment === 'production' ? 'LIVE' : 'TEST'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Enter your card details below. All information is encrypted and secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mount point for Square Card */}
              <div id="square-card-mount" className="min-h-[100px]" />
              
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
              <CashAppLogo className="w-5 h-5" />
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
                  <CashAppLogo className="w-4 h-4" />
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
                <CashAppLogo className="mr-2 h-4 w-4" />
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