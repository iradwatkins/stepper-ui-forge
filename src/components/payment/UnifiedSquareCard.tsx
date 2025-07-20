import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { unifiedPaymentManager } from '@/lib/services/unifiedPaymentManager';

interface UnifiedSquareCardProps {
  amount: number; // Amount in cents
  onPaymentSuccess?: (token: string) => void;
  onPaymentError?: (error: string) => void;
}

export const UnifiedSquareCard: React.FC<UnifiedSquareCardProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardInstanceRef = useRef<any>(null);
  const containerId = useRef(`card-container-${Date.now()}`);

  useEffect(() => {
    let mounted = true;

    const initializeCard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for container to be in DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!cardContainerRef.current || !mounted) return;

        // Set unique ID for this container
        cardContainerRef.current.id = containerId.current;

        // Initialize card payment
        const card = await unifiedPaymentManager.createCardPayment(`#${containerId.current}`);
        
        if (!mounted) return;

        cardInstanceRef.current = card;
        setIsLoading(false);

      } catch (err: any) {
        if (!mounted) return;
        
        console.error('Card initialization error:', err);
        const errorMsg = err.message || 'Failed to initialize card payment';
        setError(errorMsg);
        onPaymentError?.(errorMsg);
        setIsLoading(false);
      }
    };

    initializeCard();

    return () => {
      mounted = false;
      if (containerId.current) {
        unifiedPaymentManager.destroyPaymentInstance(containerId.current).catch(console.error);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardInstanceRef.current) {
      setError('Card not initialized');
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      
      const token = await unifiedPaymentManager.tokenizeCard(cardInstanceRef.current);
      console.log('✅ Card tokenized successfully');
      onPaymentSuccess?.(token);
    } catch (err: any) {
      const errorMsg = err.message || 'Payment failed';
      setError(errorMsg);
      onPaymentError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Credit or Debit Card
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div 
            ref={cardContainerRef}
            className="min-h-[90px] border rounded-lg p-4 bg-background"
          >
            {isLoading && (
              <div className="flex items-center justify-center h-[60px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading card form...</span>
              </div>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isLoading && (
            <Button 
              type="submit" 
              className="w-full mt-4"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${(amount / 100).toFixed(2)}
                </>
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
};