// ==========================================
// SQUARE CREDIT CARD - PRODUCTION ONLY
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { productionPaymentManager } from '@/lib/payments/ProductionPaymentManager';

interface SquareCardPaymentProps {
  amount: number; // Amount in cents
  orderId: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export const SquareCardPayment: React.FC<SquareCardPaymentProps> = ({
  amount,
  orderId,
  onSuccess,
  onError
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initCard = async () => {
      try {
        console.log('[SquareCard] Initializing production card form...');
        
        const card = await productionPaymentManager.createCard();
        await card.attach('#square-card-container');
        
        cardRef.current = card;
        setIsReady(true);
        setError(null);
        console.log('[SquareCard] Production card form ready');
      } catch (error: any) {
        console.error('[SquareCard] Initialization error:', error);
        let errorMessage = error.message || 'Failed to initialize payment form';
        
        // Check for the common Square credentials error
        if (errorMessage.includes('applicationId') && errorMessage.includes('format')) {
          errorMessage = 'Square payment is not configured. Please contact support or see IMPORTANT_SQUARE_SETUP.md for setup instructions.';
        }
        
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    initCard();

    return () => {
      if (cardRef.current?.destroy) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          console.error('[SquareCard] Cleanup error:', e);
        }
      }
    };
  }, [onError]);

  const handlePayment = async () => {
    if (!cardRef.current || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await cardRef.current.tokenize();
      
      if (result.status === 'OK') {
        console.log('[SquareCard] Card tokenized successfully');
        
        // Process PRODUCTION payment
        const response = await fetch('/rest/v1/rpc/process_square_payment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify({
            p_source_id: result.token,
            p_amount: amount,
            p_order_id: orderId,
            p_payment_method: 'card',
            p_idempotency_key: `${orderId}_${Date.now()}`
          })
        });

        const data = await response.json();
        
        if (data && !data.error) {
          console.log('[SquareCard] Production payment successful:', data.payment_id);
          onSuccess(data.payment_id);
        } else {
          throw new Error(data.error || 'Payment processing failed');
        }
      } else {
        throw new Error(result.errors?.[0]?.message || 'Card validation failed');
      }
    } catch (error: any) {
      console.error('[SquareCard] Payment error:', error);
      const errorMessage = error.message || 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="square-card-payment space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Pay with Credit/Debit Card</h3>
      </div>
      
      <div 
        id="square-card-container" 
        className="min-h-[100px] border border-border rounded-lg p-3 bg-muted/30"
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
        ) : (
          <>Pay ${(amount / 100).toFixed(2)}</>
        )}
      </Button>
    </div>
  );
};