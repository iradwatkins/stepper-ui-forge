import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, AlertCircle, Shield } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
  }
}

interface SquarePaymentStableProps {
  amount: number;
  onPaymentToken: (token: string) => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export function SquarePaymentStable({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false 
}: SquarePaymentStableProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);
  const [isAttached, setIsAttached] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);
  const attachedRef = useRef(false);
  
  // Stable initialization function
  const initializeSquare = useCallback(async () => {
    // Prevent multiple initializations
    if (initializingRef.current || attachedRef.current) {
      console.log('[SquareStable] Already initializing or attached, skipping');
      return;
    }
    
    initializingRef.current = true;
    console.log('[SquareStable] Starting initialization...');
    
    try {
      // Step 1: Check environment
      const appId = import.meta.env.VITE_SQUARE_APP_ID;
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
      
      if (!appId || !locationId) {
        throw new Error('Missing Square credentials');
      }
      
      console.log('[SquareStable] Environment:', environment);
      
      // Step 2: Load Square SDK if needed
      if (!window.Square) {
        console.log('[SquareStable] Loading Square SDK...');
        const sdkUrl = environment === 'production' 
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js';
          
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = sdkUrl;
          script.onload = () => {
            console.log('[SquareStable] SDK loaded');
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load Square SDK'));
          document.head.appendChild(script);
        });
        
        // Wait for Square to be available
        let attempts = 0;
        while (!window.Square && attempts < 30) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        
        if (!window.Square) {
          throw new Error('Square SDK not available after loading');
        }
      }
      
      console.log('[SquareStable] Creating payments instance...');
      const payments = window.Square.payments({
        applicationId: appId,
        locationId: locationId
      });
      
      console.log('[SquareStable] Creating card instance...');
      const cardInstance = await payments.card();
      
      // Step 3: Wait for container to be ready
      let containerAttempts = 0;
      while ((!containerRef.current || !document.getElementById('square-stable-container')) && containerAttempts < 10) {
        console.log('[SquareStable] Waiting for container...');
        await new Promise(r => setTimeout(r, 200));
        containerAttempts++;
      }
      
      const container = document.getElementById('square-stable-container');
      if (!container) {
        throw new Error('Container not found after waiting');
      }
      
      // Step 4: Attach card
      console.log('[SquareStable] Attaching card to container...');
      await cardInstance.attach('#square-stable-container');
      
      attachedRef.current = true;
      setCard(cardInstance);
      setIsAttached(true);
      setIsLoading(false);
      console.log('[SquareStable] ✅ Successfully attached!');
      
    } catch (err: any) {
      console.error('[SquareStable] Error:', err);
      setError(err.message || 'Failed to initialize payment form');
      setIsLoading(false);
      onError(err.message || 'Failed to initialize payment form');
    } finally {
      initializingRef.current = false;
    }
  }, [onError]);
  
  // Single effect for initialization
  useEffect(() => {
    // Delay initialization to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeSquare();
    }, 300);
    
    return () => {
      clearTimeout(timer);
      // Cleanup on unmount
      if (card?.destroy && attachedRef.current) {
        try {
          card.destroy();
          attachedRef.current = false;
        } catch (e) {
          console.error('[SquareStable] Cleanup error:', e);
        }
      }
    };
  }, []); // Empty deps - only run once
  
  const handlePayment = async () => {
    if (!card) {
      setError('Payment form not initialized');
      return;
    }
    
    try {
      console.log('[SquareStable] Starting tokenization...');
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        console.log('[SquareStable] Tokenization successful');
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
  
  const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  
  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Square Payment (Stable)
          </div>
          <Badge variant={environment === 'production' ? 'default' : 'secondary'}>
            <Shield className="w-3 h-3 mr-1" />
            {environment === 'production' ? 'LIVE' : 'TEST'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Optimized to handle authentication re-renders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Square Card Container */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Card Details</label>
          <div 
            ref={containerRef}
            id="square-stable-container"
            className="border-2 border-gray-300 rounded-lg p-4 bg-white"
            style={{ 
              minHeight: '150px',
              display: 'block',
              position: 'relative'
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading secure payment form...
                  </p>
                </div>
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
            <AlertDescription>{error}</AlertDescription>
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
        
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• This component is wrapped in StablePaymentWrapper</p>
          <p>• Prevents re-initialization during auth changes</p>
          <p>• Check console for [SquareStable] logs</p>
        </div>
      </CardContent>
    </Card>
  );
}