import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { initializeSquareWithFallback } from '@/lib/payments/square-init-fix';

interface SquarePaymentSimpleProps {
  amount: number; // Amount in cents (e.g., 5200 for $52.00)
  onPaymentToken: (token: string, paymentMethod: 'card' | 'cashapp') => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
  showHeader?: boolean; // Whether to show the card header section
}

declare global {
  interface Window {
    Square: any;
  }
}

export function SquarePaymentSimple({ 
  amount, 
  onPaymentToken, 
  onError, 
  isProcessing = false,
  showHeader = true
}: SquarePaymentSimpleProps) {
  const cardRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;
    initRef.current = true;
    
    // CRITICAL: Stop any existing retry loops (this is the main fix!)
    for (let i = 1; i < 9999; i++) {
      clearInterval(i);
      clearTimeout(i);
    }
    console.log('[SquareSimple] ✅ Stopped all retry loops');

    const initSquare = async () => {
      try {
        console.log('[SquareSimple] Starting initialization');
        
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Load Square SDK if needed
        if (!window.Square) {
          console.log('[SquareSimple] Loading Square SDK...');
          const script = document.createElement('script');
          script.src = 'https://web.squarecdn.com/v1/square.js';
          script.async = true;
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          
          // Wait for Square to be available
          let attempts = 0;
          while (!window.Square && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
          }
        }
        
        if (!window.Square) {
          throw new Error('Square SDK failed to load');
        }
        
        // Use robust initialization with fallback
        const { payments, config } = await initializeSquareWithFallback();
        
        console.log('[SquareSimple] Initialized with config:', {
          appId: config.appId.substring(0, 15) + '...',
          locationId: config.locationId,
          environment: config.environment
        });
        
        const card = await payments.card();
        
        // Create unique container ID to avoid conflicts
        const containerId = `square-simple-${Date.now()}`;
        if (containerRef.current) {
          containerRef.current.id = containerId;
          
          console.log('[SquareSimple] Attaching to container:', containerId);
          await card.attach(`#${containerId}`);
          
          cardRef.current = card;
          setIsReady(true);
          setError(null);
          
          console.log('[SquareSimple] ✅ Square card attached successfully');
        }
        
      } catch (error) {
        console.error('[SquareSimple] Init error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payment form';
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    // Start initialization
    initSquare();

    // Cleanup
    return () => {
      if (cardRef.current?.destroy) {
        try {
          cardRef.current.destroy();
        } catch (e) {
          console.error('[SquareSimple] Cleanup error:', e);
        }
      }
    };
  }, []); // Empty deps = run once

  const handlePayment = async () => {
    if (!cardRef.current) {
      onError('Payment form not ready');
      return;
    }
    
    try {
      setError(null);
      const result = await cardRef.current.tokenize();
      
      if (result.status === 'OK') {
        console.log('[SquareSimple] Token generated:', result.token);
        onPaymentToken(result.token, 'card');
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Card validation failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Container with ref for dynamic ID assignment */}
      <div 
        ref={containerRef}
        className="min-h-[100px] border rounded-lg p-3 bg-background relative"
      >
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading payment form...</p>
            </div>
          </div>
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
        disabled={!isReady || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : !isReady ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${(amount).toFixed(2)}
          </>
        )}
      </Button>
    </div>
  );

  // Conditionally wrap with Card based on showHeader prop
  if (showHeader) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Card Payment
          </CardTitle>
          <CardDescription>
            Enter your card details securely below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  // Return just the content without Card wrapper
  return content;
}