import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
  }
}

interface SquareProductionFixProps {
  amount?: number;
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
}

export function SquareProductionFix({ 
  amount = 25.00, 
  onSuccess, 
  onError 
}: SquareProductionFixProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  
  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;
    initRef.current = true;
    
    // Stop any existing retry loops
    for (let i = 1; i < 9999; i++) {
      clearInterval(i);
      clearTimeout(i);
    }
    
    const initSquare = async () => {
      try {
        // Wait for DOM
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Load Square SDK if needed
        if (!window.Square) {
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
        
        // Initialize payments
        const appId = import.meta.env.VITE_SQUARE_APP_ID || 'sq0idp-XG8irNWHf98C62-iqOwH6Q';
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID || 'L0Q2YC1SPBGD8';
        
        const payments = window.Square.payments(appId, locationId);
        const cardInstance = await payments.card();
        
        // Create a unique container ID
        const containerId = `square-fix-${Date.now()}`;
        if (containerRef.current) {
          containerRef.current.id = containerId;
          
          // Attach card
          await cardInstance.attach(`#${containerId}`);
          
          setCard(cardInstance);
          setStatus('ready');
          console.log('✅ Square card attached successfully');
        }
        
      } catch (err: any) {
        console.error('Square initialization error:', err);
        setError(err.message || 'Failed to initialize payment form');
        setStatus('error');
        onError?.(err.message);
      }
    };
    
    initSquare();
    
    // Cleanup
    return () => {
      if (card?.destroy) {
        try {
          card.destroy();
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
    };
  }, []); // Empty deps - run once
  
  const handlePayment = async () => {
    if (!card) return;
    
    try {
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        console.log('Payment token:', result.token);
        onSuccess?.(result.token);
        alert(`Success! Token: ${result.token.substring(0, 30)}...`);
      } else {
        const errorMsg = result.errors?.[0]?.message || 'Payment failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    }
  };
  
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Square Payment (Production Fix)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Container */}
        <div 
          ref={containerRef}
          className="border-2 border-gray-300 rounded-lg p-4 min-h-[120px] bg-white relative"
        >
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading payment form...</p>
              </div>
            </div>
          )}
        </div>
        
        {status === 'ready' && (
          <p className="text-xs text-gray-600">
            Test: 4111 1111 1111 1111 • Any future date • Any CVV
          </p>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handlePayment}
          disabled={status !== 'ready'}
          className="w-full"
          size="lg"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}