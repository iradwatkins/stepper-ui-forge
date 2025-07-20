import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Smartphone, CreditCard, Info } from 'lucide-react';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';

declare global {
  interface Window {
    Square: any;
  }
}

export function CashAppPayImplementation() {
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<any>(null);
  const [cashAppPay, setCashAppPay] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Test order details
  const orderDetails = {
    items: [
      { name: 'Sample Product', price: 10.00 },
      { name: 'Tax', price: 0.80 }
    ],
    total: 10.80
  };

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeSquarePayments();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      // Clean up Cash App Pay instance
      if (cashAppPay?.destroy) {
        cashAppPay.destroy();
      }
    };
  }, []);

  const initializeSquarePayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get Square credentials from environment
      const squareApplicationId = import.meta.env.VITE_SQUARE_APP_ID;
      const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

      console.log('🔧 Initializing Cash App Pay with Square credentials:');
      console.log('Application ID:', squareApplicationId?.substring(0, 15) + '...');
      console.log('Location ID:', squareLocationId);
      console.log('Environment:', squareEnvironment);

      // Validate credentials
      if (!squareApplicationId || !squareLocationId) {
        throw new Error('Missing Square credentials. Please check your environment variables.');
      }

      // Load Square SDK
      const scriptUrl = squareEnvironment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      if (!window.Square) {
        await loadSquareSDK(scriptUrl);
      }

      // Initialize Square payments
      const squarePayments = window.Square.payments(squareApplicationId, squareLocationId);
      setPayments(squarePayments);

      // Create payment request for Cash App Pay
      const paymentRequest = squarePayments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: orderDetails.total.toFixed(2),
          label: 'Total'
        }
      });

      console.log('📱 Initializing Cash App Pay...');
      console.log('Payment request:', {
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: orderDetails.total.toFixed(2),
          label: 'Total'
        }
      });

      // Initialize Cash App Pay
      // Note: Cash App Pay uses Square's application ID, not a separate Cash App ID
      const cashApp = await squarePayments.cashAppPay(paymentRequest, {
        redirectURL: window.location.href,
        referenceId: `order-${Date.now()}`
      });

      // Wait for container to exist
      await waitForElement('#cash-app-pay-container');
      
      // Attach to DOM
      await cashApp.attach('#cash-app-pay-container');
      setCashAppPay(cashApp);

      // Set up event listener for payment authorization
      cashApp.addEventListener('ontokenization', async (event: any) => {
        console.log('Cash App Pay tokenization event:', event.detail);
        const { tokenResult, error } = event.detail;
        
        if (error) {
          console.error('Cash App Pay error:', error);
          setError(error.message || 'Payment authorization failed');
          return;
        }

        if (tokenResult.status === 'OK') {
          console.log('✅ Cash App Pay token received:', tokenResult.token);
          setPaymentToken(tokenResult.token);
          // Automatically process the payment
          await processPayment(tokenResult.token);
        } else {
          const errorMessage = tokenResult.errors?.[0]?.message || 'Payment authorization failed';
          console.error('Tokenization failed:', errorMessage);
          setError(errorMessage);
        }
      });
      
      // Also listen for ready event
      cashApp.addEventListener('ready', () => {
        console.log('✅ Cash App Pay button is ready');
      });

      console.log('✅ Cash App Pay initialized successfully');
      setIsLoading(false);

    } catch (err) {
      console.error('❌ Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Cash App Pay');
      setIsLoading(false);
    }
  };

  const waitForElement = (selector: string, timeout = 5000): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector) as HTMLElement;
        
        if (element) {
          console.log('✅ Found element:', selector);
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

  const loadSquareSDK = (scriptUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        if (window.Square) {
          resolve();
          return;
        }
        // Wait for existing script to load
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          if (window.Square) {
            clearInterval(checkInterval);
            resolve();
          } else if (checkCount > 50) {
            clearInterval(checkInterval);
            reject(new Error('Square SDK failed to load'));
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        reject(new Error('Square SDK loading timeout'));
      }, 30000);

      script.onload = () => {
        clearTimeout(timeout);
        setTimeout(() => {
          if (window.Square) {
            resolve();
          } else {
            reject(new Error('Square SDK loaded but not available'));
          }
        }, 100);
      };

      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Square SDK'));
      };

      document.head.appendChild(script);
    });
  };

  const processPayment = async (token: string) => {
    setIsProcessing(true);
    setPaymentResult(null);
    
    try {
      console.log('💳 Processing payment with token:', token.substring(0, 20) + '...');
      
      const result = await productionPaymentService.processPayment({
        amount: orderDetails.total,
        gateway: 'cashapp',
        sourceId: token,
        orderId: `cashapp_${Date.now()}`,
        customerEmail: 'test@example.com',
        idempotencyKey: `cashapp_${Date.now()}_${Math.random()}`
      });
      
      console.log('Payment result:', result);
      setPaymentResult(result);
      
      if (!result.success) {
        setError(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError(error instanceof Error ? error.message : 'Payment processing failed');
      setPaymentResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  const isProduction = environment === 'production';

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Loading Cash App Pay...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Cash App Pay Integration</h1>

      {/* Environment Badge */}
      <div className="mb-4 flex justify-center">
        <Badge variant={isProduction ? 'default' : 'secondary'} className="text-sm">
          {environment.toUpperCase()} ENVIRONMENT
        </Badge>
      </div>

      {/* Important Note for Production */}
      {isProduction && (
        <Alert className="mb-6 border-orange-500">
          <Info className="h-4 w-4" />
          <AlertTitle>Production Mode Active</AlertTitle>
          <AlertDescription>
            You are using production Square credentials. Any payments made will be real transactions.
            Cash App Pay works with your Square Application ID - no separate Cash App ID needed.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>${item.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 font-semibold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>${orderDetails.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash App Pay Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pay with Cash App
            </CardTitle>
            <CardDescription>
              Click the button below to pay with Cash App. On mobile, you'll be redirected to Cash App.
              On desktop, scan the QR code with your Cash App.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Cash App Pay Button Container - Must exist before initialization */}
            <div 
              id="cash-app-pay-container" 
              className="min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
              style={{ minHeight: '60px' }}
            >
              {isLoading && (
                <span className="text-sm text-muted-foreground">Cash App Pay button will appear here...</span>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {paymentToken && !paymentResult && (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Payment Authorized</AlertTitle>
                <AlertDescription>
                  Token received. Processing payment...
                </AlertDescription>
              </Alert>
            )}

            {paymentResult && (
              <Alert 
                className={`mt-4 ${paymentResult.success ? 'border-green-500' : 'border-red-500'}`}
                variant={paymentResult.success ? 'default' : 'destructive'}
              >
                <AlertTitle>
                  {paymentResult.success ? 'Payment Successful!' : 'Payment Failed'}
                </AlertTitle>
                <AlertDescription>
                  {paymentResult.success ? (
                    <div className="space-y-1">
                      <p>Transaction ID: {paymentResult.data?.transactionId}</p>
                      <p>Status: {paymentResult.data?.status}</p>
                    </div>
                  ) : (
                    <p>{paymentResult.error || 'Unknown error occurred'}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing payment...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Implementation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">How Cash App Pay Works:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Customer clicks the Cash App Pay button</li>
                <li>On mobile: Redirects to Cash App app</li>
                <li>On desktop: Shows QR code to scan</li>
                <li>Customer approves payment in Cash App</li>
                <li>Payment token is sent to your server</li>
                <li>Server processes payment via Square API</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Key Points:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Uses your Square Application ID (no separate Cash App ID needed)</li>
                <li>Works in both sandbox and production environments</li>
                <li>Supports both mobile and desktop experiences</li>
                <li>Payment processing uses Square's payment API</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Current Configuration:</h4>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <p>Environment: {environment}</p>
                <p>App ID: {import.meta.env.VITE_SQUARE_APP_ID?.substring(0, 15)}...</p>
                <p>Location: {import.meta.env.VITE_SQUARE_LOCATION_ID}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CashAppPayImplementation;