import React, { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';

interface SquarePaymentSimpleProps {
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

export function SquarePaymentSimple({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false
}: SquarePaymentSimpleProps) {
  const cardRef = useRef<any>(null);
  const hasInitialized = useRef(false);
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useLayoutEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Simple initialization - no loops, no waiting
    const initSquare = async () => {
      try {
        console.log('[SquareSimple] Starting initialization');
        
        // Check if Square is loaded
        if (!window.Square) {
          throw new Error('Square.js not loaded. Please check your internet connection.');
        }

        const appId = import.meta.env.VITE_SQUARE_APP_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

        console.log('[SquareSimple] Creating payments instance');
        const payments = window.Square.payments(appId, locationId);
        
        console.log('[SquareSimple] Creating card instance');
        const card = await payments.card();
        
        console.log('[SquareSimple] Attaching to container');
        // The container exists because React already rendered it
        await card.attach('#square-card-simple');
        
        cardRef.current = card;
        setIsReady(true);
        setError(null);
        
        console.log('[SquareSimple] ✅ Initialization complete');
      } catch (error) {
        console.error('[SquareSimple] Init error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payment form';
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initSquare, 50);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (cardRef.current && cardRef.current.destroy) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          console.error('[SquareSimple] Cleanup error:', e);
        }
      }
    };
  }, []); // Empty deps = run once

  const handlePayment = async () => {
    if (!cardRef.current) {
      onError('Payment form not ready');
      return;
    }
    
    try {
      setError(null);
      const result = await cardRef.current.tokenize();
      
      if (result.status === 'OK') {
        console.log('[SquareSimple] Token generated:', result.token);
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
          {/* This div MUST have the exact ID that Square is looking for */}
          <div 
            id="square-card-simple" 
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
        </div>
      </CardContent>
    </Card>
  );
}