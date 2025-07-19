import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';

interface CashAppPayProps {
  amount: number;
  orderId: string;
  customerEmail: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

// Cash App Client IDs from environment
const CASH_APP_CLIENT_ID = import.meta.env.VITE_CASH_APP_CLIENT_ID || import.meta.env.VITE_SQUARE_APPLICATION_ID;
const CASH_APP_ENVIRONMENT = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

// Script URL based on environment
const CASH_APP_SCRIPT_URL = CASH_APP_ENVIRONMENT === 'production' 
  ? 'https://kit.cash.app/v1/pay.js'
  : 'https://sandbox.kit.cash.app/v1/pay.js';

declare global {
  interface Window {
    CashApp?: {
      pay: (config: { clientId: string }) => Promise<any>;
    };
  }
}

export function CashAppPay({ amount, orderId, customerEmail, onSuccess, onError }: CashAppPayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const payRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!CASH_APP_CLIENT_ID) {
      setError('Cash App is not configured. Please contact support.');
      setIsLoading(false);
      return;
    }

    const loadCashAppScript = async () => {
      // Check if script is already loaded
      if (window.CashApp && scriptLoadedRef.current) {
        await initializeCashApp();
        return;
      }

      // Load Cash App Pay Kit script
      const script = document.createElement('script');
      script.src = CASH_APP_SCRIPT_URL;
      script.async = true;

      script.onload = async () => {
        scriptLoadedRef.current = true;
        await initializeCashApp();
      };

      script.onerror = () => {
        setError('Failed to load Cash App payment system');
        setIsLoading(false);
      };

      document.body.appendChild(script);
    };

    const initializeCashApp = async () => {
      try {
        if (!window.CashApp) {
          throw new Error('Cash App SDK not loaded');
        }

        // Initialize Pay Kit
        const pay = await window.CashApp.pay({ clientId: CASH_APP_CLIENT_ID });
        payRef.current = pay;

        // Listen for payment approval
        pay.addEventListener('CUSTOMER_REQUEST_APPROVED', async (data: any) => {
          try {
            // Process the payment through our backend
            const result = await productionPaymentService.processPayment({
              amount,
              gateway: 'cashapp',
              orderId,
              customerEmail,
              sourceId: data.grants?.payment?.grantId // Use the grant ID as source
            });

            if (result.success) {
              onSuccess(result);
            } else {
              onError(result.error || 'Payment processing failed');
            }
          } catch (error) {
            onError(error instanceof Error ? error.message : 'Payment processing failed');
          }
        });

        // Listen for other events
        pay.addEventListener('CUSTOMER_REQUEST_DECLINED', () => {
          onError('Payment was declined');
        });

        pay.addEventListener('CUSTOMER_REQUEST_FAILED', (data: any) => {
          onError(data?.error || 'Payment failed');
        });

        pay.addEventListener('CUSTOMER_DISMISSED', () => {
          setError('Payment cancelled');
        });

        // Create customer request
        const customerRequest = {
          actions: {
            payment: {
              amount: {
                currency: 'USD',
                value: Math.round(amount * 100) // Convert to cents
              },
              scopeId: import.meta.env.VITE_CASH_APP_MERCHANT_ID || 'default_merchant'
            }
          },
          redirectURL: window.location.href,
          referenceId: orderId
        };

        await pay.customerRequest(customerRequest);

        // Render Cash App Pay button
        if (containerRef.current) {
          await pay.render(containerRef.current, {
            button: {
              theme: 'dark',
              size: 'medium',
              width: 'full'
            }
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Cash App initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Cash App');
        setIsLoading(false);
      }
    };

    loadCashAppScript();

    // Cleanup
    return () => {
      if (payRef.current?.destroy) {
        payRef.current.destroy();
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
      <div ref={containerRef} className="cash-app-pay-container" />
      
      {!isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          On mobile, you'll be redirected to Cash App. On desktop, scan the QR code with your phone.
        </div>
      )}
    </div>
  );
}