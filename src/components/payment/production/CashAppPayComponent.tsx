// ==========================================
// CASH APP PAY - PRODUCTION ONLY
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { productionPaymentManager } from '@/lib/payments/ProductionPaymentManager';

interface CashAppPayComponentProps {
  amount: number; // Amount in cents
  orderId: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export const CashAppPayComponent: React.FC<CashAppPayComponentProps> = ({
  amount,
  orderId,
  onSuccess,
  onError
}) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cashAppRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initCashApp = async () => {
      try {
        console.log('[CashApp] Initializing production Cash App Pay...');
        
        // Create production payment request
        const paymentRequest = await productionPaymentManager.createPaymentRequest(amount);

        // Initialize Cash App Pay for production
        const cashAppPay = await productionPaymentManager.createCashAppPay(
          paymentRequest,
          {
            redirectURL: window.location.href,
            referenceId: orderId
          }
        );

        // Attach to DOM
        await cashAppPay.attach('#cash-app-container');
        
        // Handle production tokenization
        cashAppPay.addEventListener('ontokenization', async (event: any) => {
          const { tokenResult, error: tokenError } = event.detail;
          
          if (tokenError) {
            console.error('[CashApp] Tokenization error:', tokenError);
            setError(tokenError.message || 'Payment authorization failed');
            onError(tokenError.message || 'Payment authorization failed');
            return;
          }
          
          if (tokenResult?.status === 'OK') {
            console.log('[CashApp] Token received, processing payment...');
            
            try {
              // Process production payment
              const response = await fetch('/rest/v1/rpc/process_square_payment', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
                },
                body: JSON.stringify({
                  p_source_id: tokenResult.token,
                  p_amount: amount,
                  p_order_id: orderId,
                  p_payment_method: 'cashapp',
                  p_idempotency_key: `${orderId}_${Date.now()}`
                })
              });

              const data = await response.json();
              
              if (data && !data.error) {
                console.log('[CashApp] Production payment successful:', data.payment_id);
                onSuccess(data.payment_id);
              } else {
                throw new Error(data.error || 'Payment processing failed');
              }
            } catch (err: any) {
              console.error('[CashApp] Payment processing error:', err);
              setError(err.message || 'Payment processing failed');
              onError(err.message || 'Payment processing failed');
            }
          } else {
            const errorMsg = tokenResult?.errors?.[0]?.message || 'Payment authorization failed';
            setError(errorMsg);
            onError(errorMsg);
          }
        });

        // Listen for ready event
        cashAppPay.addEventListener('ready', () => {
          console.log('[CashApp] Production Cash App Pay ready');
          setIsReady(true);
          setError(null);
        });

        cashAppRef.current = cashAppPay;
        
      } catch (error: any) {
        console.error('[CashApp] Initialization error:', error);
        const errorMessage = error.message || 'Failed to initialize Cash App Pay';
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    initCashApp();

    return () => {
      if (cashAppRef.current?.destroy) {
        try {
          cashAppRef.current.destroy();
          console.log('[CashApp] Instance destroyed');
        } catch (e) {
          console.error('[CashApp] Cleanup error:', e);
        }
      }
    };
  }, [amount, orderId, onSuccess, onError]);

  return (
    <div className="cash-app-payment space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Pay with Cash App</h3>
      </div>
      
      <div 
        id="cash-app-container"
        className="min-h-[60px]"
      />
      
      {!isReady && !error && (
        <div className="flex items-center justify-center p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Loading Cash App Pay...</span>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isReady && (
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <Smartphone className="h-3 w-3" />
            <span>Tap the button above to pay with Cash App</span>
          </div>
          <div>Desktop: Scan QR code • Mobile: Open Cash App</div>
        </div>
      )}
    </div>
  );
};