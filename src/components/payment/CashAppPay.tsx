import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';
import { paymentManager } from '@/lib/services/paymentManager';
import { waitForCashAppContainer } from '@/utils/containerUtils';

interface CashAppPayProps {
  amount: number;
  orderId: string;
  customerEmail: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}


export function CashAppPay({ amount, orderId, customerEmail, onSuccess, onError }: CashAppPayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let instance: any = null;

    // Using proper container utils instead of custom implementation

    const initializeCashAppPay = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for container to be in DOM using proper container utils
        await waitForCashAppContainer(containerRef);

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create Cash App Pay instance using payment manager
        const result = await paymentManager.createCashAppPay(
          '#cash-app-pay-container',
          { 
            referenceId: orderId,
            amount: amount // Pass amount in dollars (Square expects dollars, not cents)
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

        setIsLoading(false);

      } catch (err) {
        console.error('Cash App Pay error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Cash App Pay';
        setError(errorMessage);
        onError(errorMessage);
        setIsLoading(false);
      }
    };

    // Initialize Cash App Pay
    initializeCashAppPay();

    // Cleanup
    return () => {
      if (instance) {
        paymentManager.destroyCashAppPay(instance).catch(console.error);
      }
    };
  }, [amount, orderId, customerEmail, onSuccess, onError]);

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
      <div ref={containerRef} id="cash-app-pay-container" className="cash-app-pay-container" />
      
      {!isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          On mobile, you'll be redirected to Cash App. On desktop, scan the QR code with your phone.
        </div>
      )}
    </div>
  );
}