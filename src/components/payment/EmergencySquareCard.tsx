import React, { useEffect, useRef, useState } from 'react';
import { createSquareCard } from '@/lib/square/emergencyPaymentManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';

interface EmergencySquareCardProps {
  amount: number; // Amount in dollars
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export function EmergencySquareCard({ amount, onSuccess, onError, isProcessing = false }: EmergencySquareCardProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const initCard = async () => {
      try {
        console.log('[EmergencyCard] Starting initialization...');
        
        const card = await createSquareCard();
        
        if (!mounted) return;
        
        // Wait for container to be ready
        let attempts = 0;
        while (!containerRef.current && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!containerRef.current) {
          throw new Error('Card container not found');
        }
        
        await card.attach('#emergency-card-container');
        cardRef.current = card;
        setIsReady(true);
        setError(null);
        
        console.log('[EmergencyCard] Ready for payments');
        
      } catch (err: any) {
        if (!mounted) return;
        
        console.error('[EmergencyCard] Init error:', err);
        const errorMsg = err.message || 'Failed to initialize payment form';
        setError(errorMsg);
        onError(errorMsg);
      }
    };

    initCard();

    return () => {
      mounted = false;
      if (cardRef.current?.destroy) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          console.error('[EmergencyCard] Cleanup error:', e);
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
        console.log('[EmergencyCard] Token generated:', result.token);
        onSuccess(result.token);
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Card validation failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        id="emergency-card-container"
        className="min-h-[100px] border rounded-lg p-3 bg-background relative"
      >
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading secure payment form...</p>
            </div>
          </div>
        )}
      </div>
      
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
  );
}