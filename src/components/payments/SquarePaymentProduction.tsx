import React, { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';

interface SquarePaymentProductionProps {
  amount: number;
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

declare global {
  interface Window {
    Square: any;
  }
}

export function SquarePaymentProduction({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false
}: SquarePaymentProductionProps) {
  const cardRef = useRef<any>(null);
  const hasInitialized = useRef(false);
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useLayoutEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initSquare = async () => {
      try {
        console.log('[SquareProduction] Starting initialization');
        
        if (!window.Square) {
          throw new Error('Square.js not loaded');
        }

        // Check if container exists
        const container = document.getElementById('square-card-production');
        if (!container) {
          console.log('[SquareProduction] Container not found, waiting...');
          setTimeout(initSquare, 100);
          return;
        }

        // IMPORTANT: Use production credentials that match your payment processor
        // You'll need to get the sandbox credentials from your Supabase dashboard
        // or update the edge function to use production credentials
        
        const appId = import.meta.env.VITE_SQUARE_APP_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

        console.log('[SquareProduction] Using credentials:', {
          appId: appId?.substring(0, 20) + '...',
          environment: import.meta.env.VITE_SQUARE_ENVIRONMENT
        });

        const payments = window.Square.payments({
          applicationId: appId,
          locationId: locationId
        });
        const card = await payments.card();
        
        await card.attach('#square-card-production');
        
        cardRef.current = card;
        setIsReady(true);
        console.log('[SquareProduction] ✅ Initialization complete');
        
      } catch (error) {
        console.error('[SquareProduction] Init error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payment form';
        
        // Check for environment mismatch
        if (errorMessage.includes('ApplicationIdEnvironmentMismatchError')) {
          setError('Configuration error: Square credentials mismatch. Please contact support.');
        } else {
          setError(errorMessage);
        }
        onError(errorMessage);
      }
    };

    const timer = setTimeout(initSquare, 100);

    return () => {
      clearTimeout(timer);
      if (cardRef.current?.destroy) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          console.error('[SquareProduction] Cleanup error:', e);
        }
      }
    };
  }, [onError]);

  const handlePayment = async () => {
    if (!cardRef.current) {
      onError('Payment form not ready');
      return;
    }
    
    try {
      setError(null);
      const result = await cardRef.current.tokenize();
      
      if (result.status === 'OK') {
        console.log('[SquareProduction] Token generated');
        onPaymentToken(result.token, 'card');
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Card validation failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Card Payment
        </CardTitle>
        <CardDescription>
          Enter your card details securely below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div 
            id="square-card-production" 
            className="min-h-[100px] border rounded-lg p-3 bg-background"
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handlePayment}
            disabled={!isReady || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !isReady ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
          
          {error?.includes('mismatch') && (
            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-yellow-50 rounded-lg">
              <p className="font-semibold text-yellow-800">Configuration Issue Detected</p>
              <p>The payment system is experiencing a configuration mismatch.</p>
              <p>Your payment gateway is configured for sandbox mode while the application is in production mode.</p>
              <p>Please use PayPal or Cash App as alternative payment methods.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}