import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Smartphone, Info, QrCode, ArrowRight } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
  }
}

interface CashAppPayCompleteProps {
  amount: number;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  orderId?: string;
  customerEmail?: string;
}

export function CashAppPayComplete({ 
  amount, 
  onSuccess, 
  onError,
  orderId = `order_${Date.now()}`,
  customerEmail = 'customer@example.com'
}: CashAppPayCompleteProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [cashAppPay, setCashAppPay] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'processing' | 'success' | 'error'>('idle');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeCashAppPay();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      // Clean up
      if (cashAppPay?.destroy) {
        cashAppPay.destroy();
      }
    };
  }, []);

  const initializeCashAppPay = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Get Square credentials
      const applicationId = import.meta.env.VITE_SQUARE_APP_ID;
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

      if (!applicationId || !locationId) {
        throw new Error('Square credentials not configured');
      }

      // Load Square SDK if needed
      const sdkUrl = environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      if (!window.Square) {
        await loadSquareSDK(sdkUrl);
      }

      // Initialize Square payments
      const payments = window.Square.payments({
        applicationId: applicationId,
        locationId: locationId
      });

      // Create payment request
      const paymentRequest = payments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: amount.toFixed(2),
          label: 'Total',
        },
      });

      // Initialize Cash App Pay
      const cashApp = await payments.cashAppPay(paymentRequest, {
        redirectURL: window.location.href,
        referenceId: orderId,
      });

      // Wait for container to exist
      await waitForElement('#cash-app-pay-button');
      
      // Attach to container
      await cashApp.attach('#cash-app-pay-button');
      setCashAppPay(cashApp);

      // Set up event listener
      cashApp.addEventListener('ontokenization', handleTokenization);

      setIsInitializing(false);
      console.log('✅ Cash App Pay initialized');
    } catch (err) {
      console.error('❌ Cash App Pay initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(errorMessage);
      setIsInitializing(false);
      onError?.(errorMessage);
    }
  };

  const waitForElement = (selector: string, timeout = 5000): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector) as HTMLElement;
        
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found after ${timeout}ms`));
        } else {
          setTimeout(checkElement, 50);
        }
      };
      
      checkElement();
    });
  };

  const loadSquareSDK = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing && window.Square) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.Square) {
          resolve();
        } else {
          reject(new Error('Square SDK failed to initialize'));
        }
      };

      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  };

  const handleTokenization = async (event: any) => {
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
      // Import and use the production payment service
      const { productionPaymentService } = await import('@/lib/payments/ProductionPaymentService');
      
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
        onSuccess?.(result.data?.transactionId || result.data?.paymentId);
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
      case 'idle':
        return null;
      case 'authorizing':
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Authorizing Payment</AlertTitle>
            <AlertDescription>
              Please complete the payment in your Cash App...
            </AlertDescription>
          </Alert>
        );
      case 'processing':
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Processing Payment</AlertTitle>
            <AlertDescription>
              Your payment is being processed. Please wait...
            </AlertDescription>
          </Alert>
        );
      case 'success':
        return (
          <Alert className="border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Payment Successful!</AlertTitle>
            <AlertDescription>
              Your payment of ${amount.toFixed(2)} has been processed successfully.
              {paymentDetails?.transactionId && (
                <div className="mt-2 text-xs">
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
    }
  };

  if (isInitializing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading Cash App Pay...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Cash App Pay
        </CardTitle>
        <CardDescription>
          Fast and secure payment with Cash App
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Amount */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Amount to pay</div>
          <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
        </div>

        {/* Cash App Pay Button Container */}
        <div 
          id="cash-app-pay-button" 
          className="min-h-[60px]"
          style={{ minHeight: '60px' }}
        >
          {isInitializing && (
            <div className="flex items-center justify-center h-[60px]">
              <span className="text-sm text-muted-foreground">Loading Cash App Pay...</span>
            </div>
          )}
        </div>

        {/* Status Display */}
        {getStatusDisplay()}

        {/* Instructions */}
        {status === 'idle' && !error && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <QrCode className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>On Desktop:</strong> Scan the QR code with your Cash App
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>On Mobile:</strong> Tap to open Cash App directly
              </div>
            </div>
          </div>
        )}

        {/* Environment Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs">
            {import.meta.env.VITE_SQUARE_ENVIRONMENT === 'production' ? 'Live Payments' : 'Test Mode'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}