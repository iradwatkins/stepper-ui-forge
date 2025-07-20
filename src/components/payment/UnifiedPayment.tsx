import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedSquareCard } from './UnifiedSquareCard';
import { UnifiedCashAppPay } from './UnifiedCashAppPay';
import { CreditCardIcon, CashAppLogo } from './PaymentLogos';
import { toast } from 'sonner';

interface UnifiedPaymentProps {
  amount: number; // Amount in cents
  onClose?: () => void;
  onPaymentComplete?: (result: any) => void;
}

export const UnifiedPayment: React.FC<UnifiedPaymentProps> = ({ 
  amount, 
  onClose,
  onPaymentComplete 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cashapp'>('card');

  const handlePaymentSuccess = async (token: string) => {
    setIsProcessing(true);
    
    try {
      // Process payment through your backend
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: token,
          amount: amount,
          paymentMethod: selectedMethod,
          gateway: 'square'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Payment successful!');
        onPaymentComplete?.(result);
        onClose?.();
      } else {
        toast.error('Payment failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Network error during payment');
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    toast.error('Payment error: ' + error);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as 'card' | 'cashapp')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card" className="flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4" />
            <span>Credit Card</span>
          </TabsTrigger>
          <TabsTrigger value="cashapp" className="flex items-center gap-2">
            <CashAppLogo className="h-5" />
            <span>Cash App</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="card" className="mt-4">
          <UnifiedSquareCard
            amount={amount}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </TabsContent>
        
        <TabsContent value="cashapp" className="mt-4">
          <UnifiedCashAppPay
            amount={amount}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </TabsContent>
      </Tabs>

      {isProcessing && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Processing your payment...
        </div>
      )}
    </div>
  );
};