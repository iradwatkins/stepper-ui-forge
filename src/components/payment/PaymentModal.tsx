// Payment Modal Component
// Multi-step modal for payment processing with better organization

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, CreditCard, Wallet, DollarSign, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { paymentService } from '@/lib/payments/PaymentService';
import type { PaymentRequest, PaymentResult, PaymentMethod } from '@/lib/payments/types';

type PaymentStep = 'method' | 'details' | 'review' | 'processing' | 'result';

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
  // State management
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method');
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
      console.log('🔄 PaymentModal opened, initializing...');
      setCurrentStep('method');
      setPaymentResult(null);
      setError(null);
      initializePaymentService();
    }
  }, [isOpen]);

  const initializePaymentService = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      console.log('🔄 Initializing payment service...');
      
      if (!paymentService.isInitialized()) {
        console.log('📝 Payment service not initialized, initializing now...');
        await paymentService.initialize();
      } else {
        console.log('✅ Payment service already initialized');
      }
      
      const status = paymentService.getStatus();
      console.log('📊 Payment service status:', status);
      
      if (status.hasAvailableGateways) {
        const methods = paymentService.getAvailablePaymentMethods();
        console.log('💳 Available payment methods:', methods);
        setAvailableMethods(methods);
        if (methods.length > 0 && !selectedMethod) {
          setSelectedMethod(methods[0].gateway);
          console.log('🎯 Auto-selected payment method:', methods[0].gateway);
        }
      } else {
        console.warn('⚠️ No payment gateways available');
        setError('No payment methods are currently available. Please check the configuration.');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment service';
      console.error('❌ Payment service initialization failed:', err);
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestPayment = async () => {
    try {
      setCurrentStep('processing');
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
      setCurrentStep('result');
      
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
      setCurrentStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 'method' && selectedMethod) {
      setCurrentStep('details');
    } else if (currentStep === 'details') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      handleTestPayment();
    }
  };

  const prevStep = () => {
    if (currentStep === 'details') {
      setCurrentStep('method');
    } else if (currentStep === 'review') {
      setCurrentStep('details');
    } else if (currentStep === 'result') {
      setCurrentStep('method');
      setPaymentResult(null);
      setError(null);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'method':
        return selectedMethod && availableMethods.length > 0;
      case 'details':
        return amount && customerEmail && description;
      case 'review':
        return true;
      default:
        return false;
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

  // Step progress indicator
  const getStepProgress = () => {
    const steps = ['method', 'details', 'review', 'processing', 'result'];
    const currentIndex = steps.indexOf(currentStep);
    return { current: currentIndex + 1, total: steps.length };
  };

  // Step content components
  const renderStepContent = () => {
    if (isInitializing) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-3" />
          <span>Initializing payment service...</span>
        </div>
      );
    }

    switch (currentStep) {
      case 'method':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold">Choose Payment Method</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select your preferred payment gateway
              </p>
            </div>
            
            {availableMethods.length > 0 ? (
              <div className="grid gap-3">
                {availableMethods.map((method) => (
                  <div
                    key={method.gateway}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMethod === method.gateway
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMethod(method.gateway)}
                  >
                    <div className="flex items-center gap-3">
                      {getMethodIcon(method.gateway)}
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.description}
                        </div>
                        {method.fees && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Fee: {method.fees.percentage}% + ${method.fees.fixed}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={method.enabled ? 'default' : 'secondary'}>
                        {method.enabled ? 'Ready' : 'Disabled'}
                      </Badge>
                      {selectedMethod === method.gateway && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  No payment methods available. Please check your configuration.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold">Payment Details</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your payment information
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Customer Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Test Payment - Event Ticket"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 'review':
        const selectedMethodData = availableMethods.find(m => m.gateway === selectedMethod);
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold">Review Payment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please review your payment details
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <div className="flex items-center gap-2">
                  {getMethodIcon(selectedMethod)}
                  <span className="font-medium">{selectedMethodData?.name}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">${amount} USD</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer Email</span>
                <span className="font-medium">{customerEmail}</span>
              </div>
              
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Description</span>
                <span className="font-medium text-right max-w-[200px]">{description}</span>
              </div>

              {selectedMethodData?.fees && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Processing Fee</span>
                    <span className="text-sm">
                      {selectedMethodData.fees.percentage}% + ${selectedMethodData.fees.fixed}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-semibold">Processing Payment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we process your payment...
              </p>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                paymentResult?.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {paymentResult?.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <h3 className="font-semibold">
                Payment {paymentResult?.success ? 'Successful' : 'Failed'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {paymentResult?.success 
                  ? 'Your payment has been processed successfully'
                  : 'There was an issue processing your payment'
                }
              </p>
            </div>

            {paymentResult?.payment && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Transaction ID</span>
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    {paymentResult.payment.transactionId.slice(-8)}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    ${paymentResult.payment.amount} {paymentResult.payment.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gateway</span>
                  <span className="font-medium">
                    {paymentResult.payment.gateway.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {paymentResult?.redirectUrl && (
              <Button 
                onClick={() => window.open(paymentResult.redirectUrl, '_blank')}
                variant="outline"
                className="w-full"
              >
                Complete Payment on {selectedMethod === 'paypal' ? 'PayPal' : 'Gateway'}
              </Button>
            )}

            {paymentResult?.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {paymentResult.error.userMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Progress Indicator */}
      {!isInitializing && (
        <div className="flex items-center justify-center space-x-2">
          {['method', 'details', 'review', 'result'].map((step, index) => {
            const isActive = currentStep === step;
            const isCompleted = ['method', 'details', 'review'].indexOf(currentStep) > index;
            
            return (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                  isActive 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : isCompleted 
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-muted bg-muted text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 ${
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Error Display */}
      {error && currentStep !== 'result' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <div className="min-h-[400px] max-h-[500px] overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      {!isInitializing && currentStep !== 'processing' && (
        <div className="flex gap-3 pt-4 border-t">
          {currentStep !== 'method' && currentStep !== 'result' && (
            <Button 
              onClick={prevStep}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep === 'result' ? (
            <Button 
              onClick={prevStep}
              variant="outline"
              className="flex-1"
            >
              New Payment
            </Button>
          ) : currentStep === 'review' ? (
            <Button 
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1"
            >
              Confirm Payment
            </Button>
          ) : (
            <Button 
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Gateway Test
            </DialogTitle>
            <DialogDescription>
              {currentStep === 'method' && 'Select your preferred payment method'}
              {currentStep === 'details' && 'Enter your payment information'}
              {currentStep === 'review' && 'Review your payment details'}
              {currentStep === 'processing' && 'Processing your payment...'}
              {currentStep === 'result' && 'Payment completed'}
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