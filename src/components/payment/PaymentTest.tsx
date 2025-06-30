// Payment Test Component
// Simple test interface for PayPal integration

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { paymentService } from '@/lib/payments/PaymentService';
import type { PaymentRequest, PaymentResult, PaymentMethod } from '@/lib/payments/types';

export const PaymentTest: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [amount, setAmount] = useState('25.00');
  const [customerEmail, setCustomerEmail] = useState('test@example.com');
  const [description, setDescription] = useState('Test Payment - Event Ticket');

  useEffect(() => {
    initializePaymentService();
  }, []);

  const initializePaymentService = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      console.log('Initializing payment service...');
      await paymentService.initialize();
      
      const status = paymentService.getStatus();
      setServiceStatus(status);
      
      if (status.hasAvailableGateways) {
        const methods = paymentService.getAvailablePaymentMethods();
        setAvailableMethods(methods);
        console.log('Available payment methods:', methods);
      }
      
    } catch (err) {
      console.error('Payment service initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment service');
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
      
      console.log('Processing payment request:', paymentRequest);
      const result = await paymentService.processPayment(paymentRequest);
      
      console.log('Payment result:', result);
      setPaymentResult(result);
      
      if (result.success && result.redirectUrl) {
        // In a real app, you'd redirect to PayPal
        console.log('Would redirect to:', result.redirectUrl);
        window.open(result.redirectUrl, '_blank');
      }
      
    } catch (err) {
      console.error('Payment processing failed:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  if (isInitializing) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Initializing Payment Service...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Compact Service Status */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-4 w-4" />
            Payment Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {serviceStatus && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(serviceStatus.gatewayHealth.paypal)}
                <span>PayPal</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(serviceStatus.gatewayHealth.square)}
                <span>Square</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(serviceStatus.gatewayHealth.cashapp)}
                <span>Cash App</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Payment Methods - Compact */}
      {availableMethods.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Available Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2">
              {availableMethods.map((method) => (
                <div key={method.gateway} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div>
                    <span className="font-medium">{method.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {method.fees && `${method.fees.percentage}% + $${method.fees.fixed}`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {method.supportedCurrencies.slice(0, 2).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Payment Test Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Test Payment</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-sm">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25.00"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm">Customer Email</Label>
              <Input
                id="email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="test@example.com"
                className="h-9"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Test Payment - Event Ticket"
              className="h-9"
            />
          </div>

          <Button 
            onClick={handleTestPayment}
            disabled={isProcessing || !serviceStatus?.hasAvailableGateways}
            className="w-full h-9"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Test Payment'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Compact Error Display */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Compact Payment Result */}
      {paymentResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {paymentResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              Payment Result
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className={paymentResult.success ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {paymentResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
              
              {paymentResult.payment && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Transaction ID:</span>
                    <code className="text-xs bg-muted px-1 rounded">{paymentResult.payment.transactionId.slice(-8)}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">${paymentResult.payment.amount} {paymentResult.payment.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Gateway:</span>
                    <span className="font-medium">{paymentResult.payment.gateway.toUpperCase()}</span>
                  </div>
                </>
              )}
              
              {paymentResult.redirectUrl && (
                <Button 
                  onClick={() => window.open(paymentResult.redirectUrl, '_blank')}
                  variant="outline"
                  className="w-full h-8 mt-3"
                  size="sm"
                >
                  Open Payment Page
                </Button>
              )}
              
              {paymentResult.error && (
                <Alert variant="destructive" className="mt-2 py-2">
                  <AlertDescription className="text-xs">
                    <strong>Error:</strong> {paymentResult.error.userMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Refresh Button */}
      <div className="flex justify-center pt-2">
        <Button 
          onClick={initializePaymentService}
          variant="outline"
          size="sm"
          disabled={isInitializing}
          className="h-8"
        >
          {isInitializing ? (
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
          ) : null}
          Refresh Status
        </Button>
      </div>
    </div>
  );
};