import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';
import { getPaymentConfig } from '@/lib/payment-config';

interface CashAppPayProps {
  amount: number;
  orderId: string;
  customerEmail: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

// Get Cash App configuration from central config
const getCashAppConfig = () => {
  const config = getPaymentConfig();
  return {
    clientId: config.cashapp.clientId,
    environment: config.cashapp.environment,
    scriptUrl: config.cashapp.environment === 'production' 
      ? 'https://kit.cash.app/v1/pay.js'
      : 'https://sandbox.kit.cash.app/v1/pay.js'
  };
};

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
    const cashAppConfig = getCashAppConfig();
    
    if (!cashAppConfig.clientId || cashAppConfig.clientId.includes('XXXXX') || cashAppConfig.clientId === 'your_cashapp_client_id_here') {
      setError('Cash App is not configured. Please set VITE_CASHAPP_CLIENT_ID in your environment variables.');
      setIsLoading(false);
      return;
    }

    const loadCashAppScript = async () => {
      // Check if script is already loaded
      if (window.CashApp && scriptLoadedRef.current) {
        await initializeCashApp();
        return;
      }

      // Load Cash App Pay Kit script with cache busting
      const script = document.createElement('script');
      const cacheBuster = `?t=${Date.now()}`;
      script.src = cashAppConfig.scriptUrl + cacheBuster;
      script.async = true;
      
      // Enhanced logging for debugging
      console.group('💰 CashApp SDK Initialization');
      console.log('Environment Config:', cashAppConfig.environment);
      console.log('Client ID:', cashAppConfig.clientId);
      console.log('Script URL:', cashAppConfig.scriptUrl);
      console.log('Full Script SRC:', script.src);
      console.log('Is Production Mode:', cashAppConfig.environment === 'production');
      console.groupEnd();

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

        // Initialize Pay Kit with enhanced error handling
        const cashAppConfig = getCashAppConfig();
        
        // Validate environment configuration before initialization
        // Note: Cash App uses Square's infrastructure, so Square App IDs are valid
        if (cashAppConfig.environment === 'production' && cashAppConfig.clientId.includes('sandbox')) {
          throw new Error('Cash App environment mismatch: Production environment requires production client ID');
        }
        
        console.log('🔍 Cash App Environment Validation:', {
          environment: cashAppConfig.environment,
          clientId: cashAppConfig.clientId.substring(0, 15) + '...',
          isProductionClient: cashAppConfig.clientId.startsWith('sq0idp-'),
          scriptUrl: cashAppConfig.scriptUrl
        });
        
        const pay = await window.CashApp.pay({ clientId: cashAppConfig.clientId });
        payRef.current = pay;
        
        console.log('✅ Cash App Pay Kit initialized successfully');

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
        console.error('❌ Cash App initialization error:', err);
        
        // Enhanced error messaging for common issues
        let errorMessage = 'Failed to initialize Cash App';
        if (err instanceof Error) {
          const errorMsg = err.message.toLowerCase();
          if (errorMsg.includes('production client id must be used in the production environment')) {
            errorMessage = 'Cash App configuration error: Production environment detected but client ID may be incorrect. Please verify VITE_CASHAPP_CLIENT_ID and VITE_CASHAPP_ENVIRONMENT settings.';
          } else if (errorMsg.includes('environment mismatch')) {
            errorMessage = err.message;
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
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