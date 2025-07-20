import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { CashAppLogo } from '@/components/payment/PaymentLogos';

declare global {
  interface Window {
    Square: any;
    CashAppPay: any;
  }
}

interface SquarePaymentComponentProps {
  amount: number;
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export function SquarePaymentComponent({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false 
}: SquarePaymentComponentProps) {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<{
    card?: any;
    cashAppPay?: any;
    payments?: any;
  }>({});
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cashapp'>('card');
  const [error, setError] = useState<string | null>(null);
  const [cashAppAvailable, setCashAppAvailable] = useState(false);
  const [cashAppAttached, setCashAppAttached] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [initAttempt, setInitAttempt] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cardAttachedRef = useRef(false);
  const [containerReady, setContainerReady] = useState(false);

  // Use useLayoutEffect to check for container readiness
  useLayoutEffect(() => {
    const checkContainer = () => {
      if (cardContainerRef.current) {
        console.log('✅ Container ref is ready');
        setContainerReady(true);
      } else {
        console.log('⏳ Container ref not ready yet');
      }
    };
    
    // Check immediately
    checkContainer();
    
    // If not ready, check after a small delay
    if (!containerReady) {
      const timer = setTimeout(checkContainer, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Don't initialize until container is ready
    if (!containerReady) {
      return;
    }
    
    const init = async () => {
      // Set loading timeout - increased to 25 seconds for production
      timeoutRef.current = setTimeout(() => {
        if (mounted && isLoading && !cardAttachedRef.current) {
          setLoadingTimeout(true);
          setIsLoading(false);
          setError('Square payment form took too long to load. This may be due to network issues or browser extensions blocking the payment SDK.');
        }
      }, 25000); // 25 second timeout for production

      try {
        await initializeSquarePayments();
      } catch (err) {
        console.error('❌ Init failed:', err);
        // Error is already handled in initializeSquarePayments
      }
    };
    
    init();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Destroy payment methods
      if (paymentMethods.card?.destroy) {
        paymentMethods.card.destroy();
      }
      if (paymentMethods.cashAppPay?.destroy) {
        paymentMethods.cashAppPay.destroy();
      }
    };
  }, [initAttempt, containerReady]); // Re-run on retry or when container becomes ready

  // Attach Cash App Pay button when cashapp is selected
  useEffect(() => {
    if (selectedMethod === 'cashapp' && paymentMethods.cashAppPay && !cashAppAttached) {
      attachCashAppPay();
    }
    
    // Reset Cash App attachment when switching away
    if (selectedMethod !== 'cashapp' && cashAppAttached) {
      setCashAppAttached(false);
      // Clear any Cash App Pay errors
      if (error?.includes('Cash App')) {
        setError(null);
      }
    }
  }, [selectedMethod, paymentMethods.cashAppPay, cashAppAttached, error]);

  const initializeSquarePayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get environment variables from Vite
      const squareApplicationId = import.meta.env.VITE_SQUARE_APP_ID;
      const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
      const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const cashAppClientId = import.meta.env.VITE_CASHAPP_CLIENT_ID;
      const cashAppEnvironment = import.meta.env.VITE_CASHAPP_ENVIRONMENT || 'sandbox';

      console.log('🔧 Initializing Square with Vite Environment Variables:');
      console.log('VITE_SQUARE_APP_ID:', squareApplicationId);
      console.log('VITE_SQUARE_ENVIRONMENT:', squareEnvironment);
      console.log('VITE_SQUARE_LOCATION_ID:', squareLocationId);
      console.log('VITE_CASHAPP_CLIENT_ID:', cashAppClientId);
      console.log('VITE_CASHAPP_ENVIRONMENT:', cashAppEnvironment);

      // Validate required environment variables
      if (!squareApplicationId || squareApplicationId.includes('XXXXX')) {
        throw new Error('Square Application ID not configured. Please set VITE_SQUARE_APP_ID in your environment variables.');
      }

      if (!squareLocationId || squareLocationId.includes('XXXXX')) {
        throw new Error('Square Location ID not configured. Please set VITE_SQUARE_LOCATION_ID in your environment variables.');
      }

      // Dynamic Square SDK URL based on environment
      const squareSdkUrl = squareEnvironment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      console.log('📦 Loading Square SDK from:', squareSdkUrl);
      console.log('🔧 Square Configuration:', {
        environment: squareEnvironment,
        applicationId: squareApplicationId?.substring(0, 20) + '...',
        locationId: squareLocationId?.substring(0, 20) + '...'
      });

      // Load Square SDK if not already loaded
      if (!window.Square) {
        console.log('⏳ Square SDK not found, loading from:', squareSdkUrl);
        const loadStartTime = Date.now();
        try {
          await loadSquareSDK(squareSdkUrl);
          console.log(`✅ Square SDK loaded in ${Date.now() - loadStartTime}ms`);
        } catch (sdkError) {
          console.error('❌ Failed to load Square SDK:', sdkError);
          // Check for common browser extension conflicts
          if (sdkError.message?.includes('connection') || sdkError.message?.includes('Receiving end')) {
            throw new Error('Failed to load Square SDK. Please disable any ad blockers or privacy extensions and try again.');
          }
          throw sdkError;
        }
      } else {
        console.log('✅ Square SDK already loaded, skipping download');
      }

      // Initialize Square payments
      console.log('🔄 Initializing Square payments object...');
      let payments;
      try {
        payments = window.Square.payments(squareApplicationId, squareLocationId);
        console.log('✅ Square payments object created');
      } catch (initError) {
        console.error('❌ Failed to create Square payments object:', initError);
        throw new Error(`Square initialization failed: ${initError.message || 'Invalid credentials or configuration'}`);
      }
      
      // Create card payment method
      console.log('🔄 Creating card payment method...');
      let card;
      try {
        card = await payments.card();
        console.log('✅ Card payment method created');
      } catch (cardError) {
        console.error('❌ Failed to create card:', cardError);
        throw new Error(`Failed to create card payment method: ${cardError.message || 'Unknown error'}`);
      }
      
      // Wait for DOM to be ready and container to exist
      // Since we've already confirmed container exists via useLayoutEffect,
      // this should be quick, but we'll still verify
      const container = document.getElementById('square-card-container');
      if (!container && cardContainerRef.current) {
        // If getElementById fails but ref exists, use the ref directly
        console.log('⚠️ getElementById failed, using ref directly');
      } else if (!container) {
        throw new Error('Card container element not found in DOM');
      }
      
      console.log('✅ Square card container verified');
      
      console.log('🔄 Attaching Square card form...');
      try {
        await card.attach('#square-card-container');
        cardAttachedRef.current = true;
        console.log('✅ Square card form attached successfully');
      } catch (attachError) {
        console.error('❌ Failed to attach Square card form:', attachError);
        throw new Error(`Failed to attach payment form: ${attachError.message || 'Unknown error'}`);
      }
      
      // Clear timeout since we succeeded
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Initialize Cash App Pay according to Square documentation
      let cashAppPay;
      try {
        if (cashAppClientId) {
          console.log('🔄 Initializing Cash App Pay...');
          
          // Create payment request with amount in dollars as string
          const paymentRequest = payments.paymentRequest({
            countryCode: 'US',
            currencyCode: 'USD',
            total: {
              amount: amount.toFixed(2), // Amount in dollars as string (e.g., "25.00")
              label: 'Total'
            }
          });
          
          // Initialize Cash App Pay with paymentRequest as first parameter
          cashAppPay = await payments.cashAppPay(paymentRequest, {
            redirectURL: window.location.href,
            referenceId: `order-${Date.now()}`
          });
          
          if (cashAppPay) {
            setCashAppAvailable(true);
            console.log(`✅ Cash App Pay initialized (${cashAppEnvironment})`);
            
            // Set up the ontokenization event listener
            cashAppPay.addEventListener('ontokenization', function(event: any) {
              const { tokenResult, error } = event.detail;
              
              if (error) {
                console.error('Cash App Pay tokenization error:', error);
                setError('Cash App Pay error: ' + (error.message || 'Unknown error'));
                onError('Cash App Pay tokenization failed');
              } else if (tokenResult.status === 'OK') {
                console.log('✅ Cash App Pay token received:', tokenResult.token);
                onPaymentToken(tokenResult.token, 'cashapp');
              } else {
                const errorMessage = `Cash App Pay tokenization failed: ${tokenResult.errors?.[0]?.message || 'Unknown error'}`;
                console.error(errorMessage);
                setError(errorMessage);
                onError(errorMessage);
              }
            });
          }
        } else {
          console.warn('Cash App Pay disabled - VITE_CASHAPP_CLIENT_ID not configured');
        }
      } catch (error) {
        console.error('❌ Cash App Pay initialization failed:', error);
        console.warn('💡 Cash App Pay may require a separate client ID from your Square App ID. Check Square Developer Dashboard for Cash App Pay specific credentials.');
      }

      setPaymentMethods({ payments, card, cashAppPay });
      setIsLoading(false);

      console.log('✅ Square payment methods initialized successfully');
    } catch (err) {
      console.error('❌ Square initialization error:', err);
      
      let errorMessage = 'Failed to initialize Square payments';
      if (err instanceof Error) {
        if (err.message.includes('Container element not found')) {
          errorMessage = 'Payment form container not ready. Please try again.';
        } else if (err.message.includes('Square SDK not loaded')) {
          errorMessage = 'Failed to load Square payment system. Please check your internet connection.';
        } else if (err.message.includes('Missing required Square configuration')) {
          errorMessage = 'Payment system configuration error. Please contact support.';
        } else if (err.message.includes('ad blockers') || err.message.includes('privacy extensions')) {
          errorMessage = err.message;
        } else if (err.message.includes('connection') || err.message.includes('Receiving end')) {
          errorMessage = 'Unable to load payment form. Please disable any ad blockers or privacy extensions and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  const attachCashAppPay = async () => {
    if (!paymentMethods.cashAppPay || cashAppAttached) return;
    
    try {
      const container = document.getElementById('cash-app-pay-container');
      if (!container) {
        console.warn('Cash App Pay container not found');
        return;
      }
      
      await paymentMethods.cashAppPay.attach('#cash-app-pay-container', {
        shape: 'semiround',
        width: 'full'
      });
      
      setCashAppAttached(true);
      console.log('✅ Cash App Pay button attached');
    } catch (error) {
      console.error('Failed to attach Cash App Pay button:', error);
      setError('Failed to display Cash App Pay button');
    }
  };

  const loadSquareSDK = (scriptUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if Square is already available
      if (window.Square) {
        console.log('✅ Square already available');
        resolve();
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        console.log('⚡ Square SDK script tag already exists, waiting for Square object...');
        // Poll for Square object
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (window.Square) {
            clearInterval(checkInterval);
            console.log(`✅ Square became available after ${attempts} checks`);
            resolve();
          } else if (attempts > 100) { // 10 seconds
            clearInterval(checkInterval);
            reject(new Error('Square SDK script exists but Square object never appeared'));
          }
        }, 100);
        return;
      }
      
      console.log('📥 Creating new Square SDK script tag...');
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Square SDK script loaded');
        // Give it a moment to initialize
        setTimeout(() => {
          if (window.Square) {
            console.log('✅ window.Square is available');
            resolve();
          } else {
            reject(new Error('Square SDK loaded but window.Square is undefined'));
          }
        }, 1000);
      };

      script.onerror = (error) => {
        console.error('❌ Square SDK script failed to load:', error);
        reject(new Error('Failed to load Square SDK script'));
      };

      document.head.appendChild(script);
    });
  };

  const handleCardPayment = async () => {
    try {
      if (!paymentMethods.card) {
        throw new Error('Card payment method not initialized');
      }

      const tokenResult = await paymentMethods.card.tokenize();
      
      if (tokenResult.status === 'OK') {
        onPaymentToken(tokenResult.token, 'card');
      } else {
        throw new Error(`Card tokenization failed: ${tokenResult.errors?.[0]?.message || 'Unknown error'}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Card tokenization failed';
      console.error('Card payment error:', err);
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleCashAppPayment = async () => {
    // Cash App Pay handles its own button and tokenization via the ontokenization event
    // Nothing to do here - the Cash App Pay button will trigger the payment flow
    console.log('Cash App Pay button handles its own payment flow');
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (selectedMethod === 'card') {
      await handleCardPayment();
    } else if (selectedMethod === 'cashapp') {
      await handleCashAppPayment();
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retrying Square payment initialization...');
    setError(null);
    setLoadingTimeout(false);
    setIsLoading(true);
    setCashAppAttached(false);
    cardAttachedRef.current = false;
    setInitAttempt(prev => prev + 1); // Trigger re-initialization
  };

  if (isLoading && !loadingTimeout) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading Square payment form...</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This may take a few seconds...
            </p>
            <p className="text-xs text-muted-foreground">
              Environment: {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'Not Set'}
            </p>
            {/* Show retry button after 10 seconds */}
            {initAttempt === 0 && (
              <Button 
                onClick={handleRetry} 
                variant="outline" 
                size="sm"
                className="mt-4"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Taking too long? Click to retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if ((error && !paymentMethods.card) || loadingTimeout) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Payment Form Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load payment form. Please try again.'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRetry} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading Payment Form
          </Button>
          {initAttempt > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Attempt {initAttempt + 1} • If the problem persists, please refresh the page
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

  return (
    <div className="space-y-4">
      {/* Environment Badge */}
      <div className="flex justify-center">
        <Badge variant={squareEnvironment === 'production' ? 'default' : 'secondary'} className="text-xs">
          <Shield className="w-3 h-3 mr-1" />
          {squareEnvironment === 'production' ? 'LIVE PAYMENTS' : 'TEST MODE'}
        </Badge>
      </div>

      {/* Payment Method Selection */}
      <div className="grid gap-3">
        <div
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'card'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setSelectedMethod('card')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              <div>
                <div className="font-medium">Credit or Debit Card</div>
                <div className="text-sm text-muted-foreground">
                  Pay securely with your card
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs">Visa</Badge>
              <Badge variant="outline" className="text-xs">MC</Badge>
              <Badge variant="outline" className="text-xs">Amex</Badge>
            </div>
          </div>
        </div>

        {cashAppAvailable && (
          <div
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedMethod === 'cashapp'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedMethod('cashapp')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CashAppLogo className="w-5 h-5" />
                <div>
                  <div className="font-medium">Cash App Pay</div>
                  <div className="text-sm text-muted-foreground">
                    Pay with your Cash App balance
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Instant
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Payment Form */}
      {selectedMethod === 'card' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Card Information
            </CardTitle>
            <CardDescription>
              Enter your card details below. All information is encrypted and secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Square Card Container */}
              <div 
                ref={cardContainerRef}
                id="square-card-container"
                className="border rounded-lg p-4 min-h-[60px] bg-background"
                style={{ minHeight: '60px' }}
              >
                {!paymentMethods.card && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Initializing card form...
                  </div>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Your payment information is encrypted and secure</p>
                <p>• We use Square's PCI-compliant payment processing</p>
                <p>• Your card details are never stored on our servers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === 'cashapp' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CashAppLogo className="w-5 h-5" />
              Cash App Pay
            </CardTitle>
            <CardDescription>
              Scan the QR code with Cash App or click the button below to pay ${amount.toFixed(2)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Cash App Pay button container */}
              <div id="cash-app-pay-container" className="min-h-[60px]" />
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="text-xs text-muted-foreground text-center">
                On mobile, you'll be redirected to Cash App. On desktop, scan the QR code with your phone.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Button - Only show for card payments */}
      {selectedMethod === 'card' && (
        <Button 
          onClick={handleSubmit}
          disabled={isProcessing || isLoading}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ${amount.toFixed(2)} with Card
            </>
          )}
        </Button>
      )}

      <div className="text-center text-xs text-muted-foreground">
        Powered by Square • PCI DSS Compliant • {squareEnvironment.toUpperCase()} Mode
      </div>
    </div>
  );
}