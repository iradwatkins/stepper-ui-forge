import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';

interface SquarePaymentModalProps {
  amount: number;
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
  isVisible?: boolean; // New prop to know when modal is visible
}

declare global {
  interface Window {
    Square: any;
  }
}

export function SquarePaymentModal({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false,
  isVisible = true
}: SquarePaymentModalProps) {
  const cardRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initStarted = useRef(false);

  useEffect(() => {
    // Only initialize when visible and not already started
    if (!isVisible || initStarted.current) return;
    
    initStarted.current = true;

    const initSquare = async () => {
      try {
        console.log('[SquareModal] Starting initialization');
        
        // Wait a bit for modal animation to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!window.Square) {
          throw new Error('Square.js not loaded');
        }

        const payments = window.Square.payments(
          import.meta.env.VITE_SQUARE_APP_ID,
          import.meta.env.VITE_SQUARE_LOCATION_ID
        );
        
        const card = await payments.card();
        
        // Try to attach with retries
        let attached = false;
        for (let i = 0; i < 5; i++) {
          try {
            await card.attach('#square-modal-container');
            attached = true;
            break;
          } catch (e) {
            console.log(`[SquareModal] Attach attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        if (!attached) {
          throw new Error('Could not attach card form after 5 attempts');
        }
        
        cardRef.current = card;
        setIsReady(true);
        console.log('[SquareModal] ✅ Initialization complete');
        
      } catch (error) {
        console.error('[SquareModal] Init error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payment form';
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    initSquare();

    return () => {
      if (cardRef.current?.destroy) {
        try {
          cardRef.current.destroy();
          cardRef.current = null;
        } catch (e) {
          console.error('[SquareModal] Cleanup error:', e);
        }
      }
      initStarted.current = false;
    };
  }, [isVisible, onError]);

  const handlePayment = async () => {
    if (!cardRef.current) {
      onError('Payment form not ready');
      return;
    }
    
    try {
      setError(null);
      const result = await cardRef.current.tokenize();
      
      if (result.status === 'OK') {
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
            id="square-modal-container" 
            className="min-h-[100px] border rounded-lg p-3 bg-background"
            style={{ position: 'relative' }}
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