// Payment Modal Component
// Compact modal version of payment testing interface

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, CreditCard, Wallet, DollarSign } from 'lucide-react';
import { paymentService } from '@/lib/payments/PaymentService';
import type { PaymentRequest, PaymentResult, PaymentMethod } from '@/lib/payments/types';

interface PaymentModalProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPaymentSuccess?: (result: PaymentResult) => void;
  onPaymentError?: (error: string) => void;
  defaultAmount?: number;
  defaultEmail?: string;
  defaultDescription?: string;
  trigger?: React.ReactNode;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onOpenChange,
  onPaymentSuccess,
  onPaymentError,
  defaultAmount = 25.00,
  defaultEmail = 'test@example.com',
  defaultDescription = 'Test Payment - Event Ticket',
  trigger
}) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [description, setDescription] = useState(defaultDescription);
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      initializePaymentService();
    }
  }, [isOpen]);

  const initializePaymentService = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      if (!paymentService.isInitialized()) {
        await paymentService.initialize();
      }
      
      const status = paymentService.getStatus();
      if (status.hasAvailableGateways) {
        const methods = paymentService.getAvailablePaymentMethods();
        setAvailableMethods(methods);
        if (methods.length > 0 && !selectedMethod) {
          setSelectedMethod(methods[0].gateway);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment service';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setPaymentResult(null);
      
      const paymentRequest: PaymentRequest = {
        amount: parseFloat(amount),
        currency: 'USD',
        orderId: `test-order-${Date.now()}`,
        description,
        customerEmail,
        customerName: 'Test Customer',
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      };
      
      const result = await paymentService.processPayment(paymentRequest);
      setPaymentResult(result);
      
      if (result.success) {
        onPaymentSuccess?.(result);
        if (result.redirectUrl) {
          window.open(result.redirectUrl, '_blank');
        }
      } else {
        onPaymentError?.(result.error?.userMessage || 'Payment failed');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodIcon = (gateway: string) => {
    switch (gateway) {
      case 'paypal':
        return <Wallet className="h-4 w-4" />;
      case 'square':
        return <CreditCard className="h-4 w-4" />;
      case 'cashapp':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const content = (
    <div className="space-y-4">
      {isInitializing ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Initializing payment service...</span>
        </div>
      ) : (
        <>
          {/* Available Payment Methods */}
          {availableMethods.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="grid gap-2">
                {availableMethods.map((method) => (
                  <div
                    key={method.gateway}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMethod === method.gateway
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMethod(method.gateway)}
                  >
                    <div className="flex items-center gap-3">
                      {getMethodIcon(method.gateway)}
                      <div>
                        <div className="font-medium text-sm">{method.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {method.fees && `${method.fees.percentage}% + $${method.fees.fixed}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant={method.enabled ? 'default' : 'secondary'} className="text-xs">
                      {method.enabled ? 'Ready' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="modal-amount" className="text-sm">Amount (USD)</Label>
                <Input
                  id="modal-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.00"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-email" className="text-sm">Customer Email</Label>
                <Input
                  id="modal-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="modal-description" className="text-sm">Description</Label>
              <Input
                id="modal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Test Payment - Event Ticket"
                className="h-9"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Result */}
          {paymentResult && (
            <Alert className={paymentResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-start gap-2">
                {paymentResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    <div className="font-medium mb-1">
                      Payment {paymentResult.success ? 'Successful' : 'Failed'}
                    </div>
                    {paymentResult.payment && (
                      <div className="text-xs space-y-1">
                        <div>Amount: ${paymentResult.payment.amount} {paymentResult.payment.currency}</div>
                        <div>Gateway: {paymentResult.payment.gateway.toUpperCase()}</div>
                        <div>ID: {paymentResult.payment.transactionId.slice(-8)}</div>
                      </div>
                    )}
                    {paymentResult.error && (
                      <div className="text-xs mt-1 text-red-600">
                        {paymentResult.error.userMessage}
                      </div>
                    )}
                  </AlertDescription>
                  {paymentResult.redirectUrl && (
                    <Button 
                      onClick={() => window.open(paymentResult.redirectUrl, '_blank')}
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                    >
                      Open Payment Page
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleTestPayment}
              disabled={isProcessing || availableMethods.length === 0 || !selectedMethod}
              className="flex-1 h-9"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Pay $${amount}`
              )}
            </Button>
            <Button 
              onClick={initializePaymentService}
              variant="outline"
              size="sm"
              disabled={isInitializing}
              className="h-9"
            >
              {isInitializing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Test
            </DialogTitle>
            <DialogDescription>
              Test payment processing with available gateways
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Test
        </CardTitle>
        <CardDescription>
          Test payment processing with available gateways
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
};