import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { createSquareCashAppPay } from '@/lib/square/emergencyPaymentManager';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';

interface EmergencyCashAppProps {
  amount: number; // Amount in dollars
  orderId: string;
  customerEmail: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export function EmergencyCashApp({ amount, orderId, customerEmail, onSuccess, onError }: EmergencyCashAppProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const initializeCashApp = async () => {
      try {
        console.log('[EmergencyCashApp] Starting initialization...');
        setIsLoading(true);
        setError(null);

        // Wait for container
        let attempts = 0;
        while (!containerRef.current && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!containerRef.current) {
          throw new Error('Container not found');
        }

        // Clear container
        containerRef.current.innerHTML = '';

        // Initialize using emergency manager
        const cashAppPay = await createSquareCashAppPay(amount, orderId);
        
        if (!mounted) return;

        // Attach to container
        await cashAppPay.attach(containerRef.current);
        instanceRef.current = cashAppPay;

        // Add event listener
        cashAppPay.addEventListener('ontokenization', async (event: any) => {
          const { tokenResult } = event.detail;
          
          if (tokenResult.status === 'OK') {
            try {
              console.log('[EmergencyCashApp] Token received:', tokenResult.token);
              
              // Convert amount to cents for API
              const result = await productionPaymentService.processPayment({
                amount: Math.round(amount * 100), // Convert to cents
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
        console.log('[EmergencyCashApp] Initialized successfully');

      } catch (err) {
        if (!mounted) return;
        
        console.error('[EmergencyCashApp] Init error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Cash App Pay';
        setError(errorMessage);
        onError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeCashApp();

    return () => {
      mounted = false;
      if (instanceRef.current?.destroy) {
        try {
          instanceRef.current.destroy();
        } catch (e) {
          console.error('[EmergencyCashApp] Cleanup error:', e);
        }
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
      <div ref={containerRef} className="emergency-cash-app-container min-h-[60px]" />
      
      {!isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          On mobile, you'll be redirected to Cash App. On desktop, scan the QR code with your phone.
        </div>
      )}
    </div>
  );
}