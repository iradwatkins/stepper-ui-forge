import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { unifiedPaymentManager } from '@/lib/services/unifiedPaymentManager';
import { CashAppLogo } from './PaymentLogos';

interface UnifiedCashAppPayProps {
  amount: number; // Amount in cents
  onPaymentSuccess?: (token: string) => void;
  onPaymentError?: (error: string) => void;
}

export const UnifiedCashAppPay: React.FC<UnifiedCashAppPayProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const containerId = useRef(`cashapp-${Date.now()}`);

  useEffect(() => {
    let mounted = true;

    const initializeCashAppPay = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for container to be in DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!containerRef.current || !mounted) return;

        // Set unique ID
        containerRef.current.id = containerId.current;

        // Create Cash App Pay instance
        const cashAppPay = await unifiedPaymentManager.createCashAppPay(
          `#${containerId.current}`,
          amount,
          { referenceId: `order-${Date.now()}` }
        );

        if (!mounted) return;

        instanceRef.current = cashAppPay;

        // Handle tokenization
        cashAppPay.addEventListener('ontokenization', async (event: any) => {
          const { tokenResult } = event.detail;
          
          if (tokenResult.status === 'OK') {
            console.log('✅ Cash App Pay tokenized successfully');
            onPaymentSuccess?.(tokenResult.token);
          } else {
            const errorMsg = tokenResult.errors?.[0]?.message || 'Payment failed';
            setError(errorMsg);
            onPaymentError?.(errorMsg);
          }
        });

        setIsLoading(false);

      } catch (err: any) {
        if (!mounted) return;
        
        console.error('Cash App Pay error:', err);
        const errorMsg = err.message || 'Failed to initialize Cash App Pay';
        setError(errorMsg);
        onPaymentError?.(errorMsg);
        setIsLoading(false);
      }
    };

    initializeCashAppPay();

    return () => {
      mounted = false;
      if (containerId.current) {
        unifiedPaymentManager.destroyPaymentInstance(containerId.current).catch(console.error);
      }
    };
  }, [amount, onPaymentSuccess, onPaymentError]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <CashAppLogo className="h-8" />
          <span>Cash App</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="min-h-[60px]">
          {isLoading && (
            <div className="flex items-center justify-center h-[60px]">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading Cash App Pay...</span>
            </div>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isLoading && !error && (
          <div className="text-sm text-muted-foreground text-center mt-4">
            <p>Click the button above to pay ${(amount / 100).toFixed(2)} with Cash App</p>
            <p className="text-xs mt-2">
              On mobile: Opens Cash App directly<br/>
              On desktop: Scan QR code with your phone
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};