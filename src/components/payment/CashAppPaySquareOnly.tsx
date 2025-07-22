import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';

declare global {
  interface Window {
    Square: any;
  }
}

interface CashAppPaySquareOnlyProps {
  amount: number;
  orderId?: string;
  customerEmail?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function CashAppPaySquareOnly({ 
  amount, 
  orderId = `order_${Date.now()}`,
  customerEmail = 'customer@example.com',
  onSuccess, 
  onError 
}: CashAppPaySquareOnlyProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<any>(null);
  const cashAppPayRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return;
    
    const initializeSquareCashApp = async () => {
      try {
        // Get Square credentials
        const appId = import.meta.env.VITE_SQUARE_APP_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

        if (!appId || !locationId) {
          throw new Error('Square credentials not configured');
        }

        console.log('🔧 Initializing Cash App Pay with Square SDK only');
        console.log('App ID:', appId.substring(0, 15) + '...');
        console.log('Location:', locationId);
        console.log('Environment:', environment);

        // Load Square SDK if not already loaded
        if (!window.Square) {
          await loadSquareSDK(environment);
        }

        // Initialize Square payments ONCE
        if (!paymentsRef.current) {
          paymentsRef.current = window.Square.payments({
            applicationId: appId,
            locationId: locationId
          });
          console.log('✅ Square payments initialized');
        }

        // Create payment request
        const paymentRequest = paymentsRef.current.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: amount.toFixed(2),
            label: 'Total',
          },
        });

        // Create Cash App Pay instance ONCE
        if (!cashAppPayRef.current) {
          cashAppPayRef.current = await paymentsRef.current.cashAppPay(paymentRequest, {
            redirectURL: window.location.href,
            referenceId: orderId,
          });
          console.log('✅ Cash App Pay instance created');

          // Add event listener ONCE
          cashAppPayRef.current.addEventListener('ontokenization', handleTokenization);
          
          // Listen for ready event
          cashAppPayRef.current.addEventListener('ready', () => {
            console.log('✅ Cash App Pay button ready');
            setStatus('ready');
          });
        }

        // Wait for container to be available
        await waitForContainer();

        // Attach to DOM ONCE
        await cashAppPayRef.current.attach(containerRef.current);
        console.log('✅ Cash App Pay attached to DOM');
        
        initializedRef.current = true;
        setStatus('ready');

      } catch (err) {
        console.error('❌ Cash App Pay initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);
      }
    };

    initializeSquareCashApp();

    // Cleanup function
    return () => {
      if (cashAppPayRef.current?.destroy) {
        cashAppPayRef.current.destroy();
        console.log('🧹 Cash App Pay instance destroyed');
      }
    };
  }, []); // Empty dependency array - run only once

  const loadSquareSDK = (environment: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const sdkUrl = environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      // Check if already loaded
      const existing = document.querySelector(`script[src="${sdkUrl}"]`);
      if (existing && window.Square) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.Square) {
          console.log('✅ Square SDK loaded');
          resolve();
        } else {
          reject(new Error('Square SDK failed to initialize'));
        }
      };

      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  };

  const waitForContainer = (): Promise<void> => {
    return new Promise((resolve) => {
      const checkContainer = () => {
        if (containerRef.current) {
          resolve();
        } else {
          setTimeout(checkContainer, 50);
        }
      };
      checkContainer();
    });
  };

  const handleTokenization = async (event: any) => {
    console.log('🎫 Tokenization event received:', event.detail);
    const { tokenResult, error } = event.detail;

    if (error) {
      console.error('Tokenization error:', error);
      setStatus('error');
      setError(error.message || 'Payment authorization failed');
      onError?.(error.message || 'Payment authorization failed');
      return;
    }

    if (tokenResult.status === 'OK') {
      console.log('✅ Payment token received');
      setStatus('processing');
      await processPayment(tokenResult.token);
    } else {
      const errorMsg = tokenResult.errors?.[0]?.message || 'Payment authorization failed';
      setStatus('error');
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const processPayment = async (token: string) => {
    try {
      console.log('💳 Processing payment with token:', token.substring(0, 20) + '...');
      
      const result = await productionPaymentService.processPayment({
        amount: amount,
        gateway: 'cashapp',
        sourceId: token,
        orderId: orderId,
        customerEmail: customerEmail,
        idempotencyKey: `${orderId}_${Date.now()}`,
      });

      if (result.success) {
        setStatus('success');
        setPaymentDetails(result.data);
        onSuccess?.(result);
        console.log('✅ Payment successful:', result);
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed';
      setStatus('error');
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading Cash App Pay...</span>
          </div>
        );
      case 'processing':
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Processing Payment</AlertTitle>
            <AlertDescription>
              Please wait while we process your payment...
            </AlertDescription>
          </Alert>
        );
      case 'success':
        return (
          <Alert className="border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Payment Successful!</AlertTitle>
            <AlertDescription>
              Your payment of ${amount.toFixed(2)} has been processed.
              {paymentDetails?.transactionId && (
                <div className="mt-1 text-xs">
                  Transaction ID: {paymentDetails.transactionId}
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Payment Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Amount Display */}
      <div className="text-center p-3 bg-muted rounded-lg">
        <div className="text-sm text-muted-foreground">Amount to pay</div>
        <div className="text-xl font-bold">${amount.toFixed(2)}</div>
      </div>

      {/* Cash App Pay Button Container */}
      <div 
        ref={containerRef}
        id="cash-app-pay-square-only"
        className="min-h-[60px]"
        style={{ minHeight: '60px' }}
      />

      {/* Status Display */}
      {getStatusDisplay()}

      {/* Instructions when ready */}
      {status === 'ready' && (
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
}