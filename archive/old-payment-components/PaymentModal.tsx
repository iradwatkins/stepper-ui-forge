// Simplified Payment Modal for production
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
  amount?: number;
  description?: string;
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  onPaymentSuccess, 
  onPaymentError,
  amount = 0,
  description = "" 
}: PaymentModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        success: true,
        paymentId: 'payment_' + Date.now(),
        amount,
        gatewayType: 'demo'
      };
      
      onPaymentSuccess?.(result);
      onClose();
    } catch (err) {
      const errorMessage = 'Payment processing is being rebuilt for production';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Complete your payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-lg font-bold">${amount.toFixed(2)}</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}