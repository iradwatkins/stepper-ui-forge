import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { paymentManager } from '@/lib/services/paymentManager';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';

interface SlideOutCashAppPayProps {
  amount: number;
  orderId: string;
  customerEmail: string;
  isOpen: boolean;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export function SlideOutCashAppPay({ 
  amount, 
  orderId, 
  customerEmail, 
  isOpen,
  onSuccess, 
  onError 
}: SlideOutCashAppPayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cashAppInstance, setCashAppInstance] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Clean up when cart closes
      if (cashAppInstance) {
        paymentManager.destroyCashAppPay(cashAppInstance);
        setCashAppInstance(null);
      }
      return;
    }

    let instance: any = null;

    const initializeCashAppPay = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create Cash App Pay instance using payment manager
        const result = await paymentManager.createCashAppPay(
          '#slide-out-cash-app-pay',
          { 
            referenceId: orderId,
            amount: Math.round(amount * 100) // Convert to cents
          }
        );
        
        instance = result.cashAppPay;

        // Add event listeners
        instance.addEventListener('ontokenization', async (event: any) => {
          const { tokenResult } = event.detail;
          
          if (tokenResult.status === 'OK') {
            try {
              const result = await productionPaymentService.processPayment({
                amount,
                gateway: 'cashapp',
                orderId,
                customerEmail,
                sourceId: tokenResult.token
              });

              if (result.success) {
                onSuccess(result);
              } else {
                onError(result.error || 'Payment processing failed');
              }
            } catch (error) {
              onError(error instanceof Error ? error.message : 'Payment processing failed');
            }
          } else {
            onError(tokenResult.errors?.[0]?.message || 'Payment failed');
          }
        });

        setCashAppInstance(instance);
        setIsLoading(false);

      } catch (err) {
        console.error('Cart Cash App Pay error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Cash App Pay';
        setError(errorMessage);
        onError(errorMessage);
        setIsLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeCashAppPay, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (instance) {
        paymentManager.destroyCashAppPay(instance);
      }
    };
  }, [isOpen, amount, orderId, customerEmail, onSuccess, onError]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading Cash App Pay...</span>
        </div>
      )}
      
      {/* Cash App Pay button will be rendered here */}
      <div ref={containerRef} id="slide-out-cash-app-pay" className="cash-app-pay-container" />
      
      {!isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          Click the button above to pay with Cash App
        </div>
      )}
    </div>
  );
}