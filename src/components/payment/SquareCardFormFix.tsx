import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';

interface SquareCardFormFixProps {
  amount: number;
  onPaymentToken: (token: string) => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export function SquareCardFormFix({ 
  amount, 
  onPaymentToken, 
  onError,
  isProcessing = false 
}: SquareCardFormFixProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);
  const [isAttached, setIsAttached] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initAttemptRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;
    
    const initializeCard = async () => {
      try {
        initAttemptRef.current++;
        console.log(`[Square Card Fix] Initialization attempt #${initAttemptRef.current}`);
        
        // Step 1: Validate environment
        const appId = import.meta.env.VITE_SQUARE_APP_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
        
        if (!appId || !locationId) {
          throw new Error('Missing Square credentials');
        }

        // Step 2: Load Square SDK
        if (!window.Square) {
          console.log('[Square Card Fix] Loading Square SDK...');
          const sdkUrl = environment === 'production' 
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js';
            
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = sdkUrl;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Square SDK'));
            document.head.appendChild(script);
          });
        }

        // Step 3: Wait for Square to be fully loaded
        let attempts = 0;
        while (!window.Square && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.Square) {
          throw new Error('Square SDK not available after loading');
        }

        // Step 4: Initialize payments
        console.log('[Square Card Fix] Initializing payments...');
        const payments = window.Square.payments({
          applicationId: appId,
          locationId: locationId
        });
        
        // Step 5: Create card instance
        console.log('[Square Card Fix] Creating card instance...');
        const cardInstance = await payments.card();
        
        // Step 6: Ensure container exists and is visible
        const container = containerRef.current;
        if (!container) {
          console.error('[Square Card Fix] Container ref is null');
          throw new Error('Container ref not available');
        }
        
        // Force layout recalculation
        container.style.display = 'block';
        container.offsetHeight; // Force reflow
        
        // Step 7: Attach with explicit options
        console.log('[Square Card Fix] Attaching card to container...');
        try {
          await cardInstance.attach('#square-card-fix-container');
          console.log('[Square Card Fix] ✅ Card attached successfully!');
          
          if (mounted) {
            setCard(cardInstance);
            setIsAttached(true);
            setIsLoading(false);
            setError(null);
          }
        } catch (attachErr: any) {
          console.error('[Square Card Fix] Attach error:', attachErr);
          
          // Common attach errors and solutions
          if (attachErr.message?.includes('container')) {
            throw new Error('Container element issue. Please refresh the page.');
          } else if (attachErr.message?.includes('already attached')) {
            // Card is already attached, this is actually OK
            if (mounted) {
              setCard(cardInstance);
              setIsAttached(true);
              setIsLoading(false);
              setError(null);
            }
          } else {
            throw attachErr;
          }
        }
        
      } catch (err: any) {
        console.error('[Square Card Fix] Initialization error:', err);
        
        if (mounted) {
          // Retry logic for specific errors
          if (initAttemptRef.current < 3 && err.message?.includes('Container')) {
            console.log('[Square Card Fix] Retrying in 1 second...');
            retryTimeout = setTimeout(() => {
              if (mounted) {
                initializeCard();
              }
            }, 1000);
          } else {
            setError(err.message || 'Failed to initialize payment form');
            setIsLoading(false);
            onError(err.message || 'Failed to initialize payment form');
          }
        }
      }
    };

    // Start initialization after a short delay to ensure DOM is ready
    const startTimeout = setTimeout(() => {
      if (mounted) {
        initializeCard();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(startTimeout);
      clearTimeout(retryTimeout);
      
      // Cleanup
      if (card?.destroy) {
        try {
          card.destroy();
        } catch (e) {
          console.error('[Square Card Fix] Cleanup error:', e);
        }
      }
    };
  }, []); // Empty deps to run once

  const handlePayment = async () => {
    if (!card) {
      setError('Payment form not initialized');
      return;
    }

    try {
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        onPaymentToken(result.token);
      } else {
        const errorMsg = result.errors?.[0]?.message || 'Card tokenization failed';
        setError(errorMsg);
        onError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Payment processing failed';
      setError(errorMsg);
      onError(errorMsg);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Credit Card Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Container for Square card form */}
        <div className="space-y-2">
          <div 
            ref={containerRef}
            id="square-card-fix-container"
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[150px] bg-white"
            style={{ 
              minHeight: '150px',
              display: 'block',
              position: 'relative'
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading payment form...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Attempt #{initAttemptRef.current}
                  </p>
                </div>
              </div>
            )}
            
            {!isLoading && !isAttached && !error && (
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">Payment form container ready</p>
                <p className="text-xs mt-1">Waiting for Square SDK...</p>
              </div>
            )}
          </div>
          
          {isAttached && (
            <p className="text-xs text-muted-foreground">
              Test card: 4111 1111 1111 1111 • Any future date • Any CVV
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes('refresh') && (
                <Button 
                  variant="link" 
                  className="ml-2 p-0 h-auto"
                  onClick={() => window.location.reload()}
                >
                  Refresh now
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handlePayment}
          disabled={!isAttached || isProcessing || isLoading}
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
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>

        {/* Debug info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>Environment: {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'}</p>
          <p>Container ready: {containerRef.current ? 'Yes' : 'No'}</p>
          <p>Card attached: {isAttached ? 'Yes' : 'No'}</p>
          <p>Square loaded: {typeof window.Square !== 'undefined' ? 'Yes' : 'No'}</p>
        </div>
      </CardContent>
    </Card>
  );
}