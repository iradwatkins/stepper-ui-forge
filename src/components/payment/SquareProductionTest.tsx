import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react';
import { SquarePaymentComponent } from './SquarePaymentComponent';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';

export function SquareProductionTest() {
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentToken = async (token: string, method: 'card' | 'cashapp') => {
    console.log('Received payment token:', token, 'Method:', method);
    setPaymentToken(token);
    setError(null);
    
    // Automatically process the payment
    await processPayment(token);
  };

  const handleError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
    setError(errorMessage);
  };

  const processPayment = async (token: string) => {
    setIsProcessing(true);
    setPaymentResult(null);
    
    try {
      const result = await productionPaymentService.processPayment({
        amount: 1.00,
        gateway: 'square',
        sourceId: token,
        orderId: `test_${Date.now()}`,
        customerEmail: 'test@example.com'
      });
      
      console.log('Payment result:', result);
      setPaymentResult(result);
    } catch (error) {
      console.error('Payment processing error:', error);
      setError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  const isProduction = environment === 'production';

  return (
    <div className="space-y-4">
      {/* Environment Info */}
      <Alert className={isProduction ? "border-orange-500" : ""}>
        <Info className="h-4 w-4" />
        <AlertTitle>Square {environment.toUpperCase()} Environment</AlertTitle>
        <AlertDescription>
          {isProduction ? (
            <>
              You are in <strong>PRODUCTION</strong> mode. 
              Test tokens (like cnon:card-nonce-ok) will NOT work. 
              You must use real card details to generate valid payment tokens.
              Use test card numbers like 4111 1111 1111 1111 for testing.
            </>
          ) : (
            <>
              You are in <strong>SANDBOX</strong> mode. 
              You can use test tokens and test card numbers.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Production Square Payment Test
          </CardTitle>
          <CardDescription>
            Test Square payments with real tokenization in {environment} environment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium">Test Card Numbers:</h4>
            <ul className="text-sm space-y-1">
              {isProduction ? (
                <>
                  <li>• <strong>Visa:</strong> 4111 1111 1111 1111</li>
                  <li>• <strong>Mastercard:</strong> 5105 1051 0510 5100</li>
                  <li>• <strong>Amex:</strong> 3782 822463 10005</li>
                  <li>• Use any future expiry date and any 3-digit CVV</li>
                  <li>• These are test cards that work in production for small amounts</li>
                </>
              ) : (
                <>
                  <li>• <strong>Any test card:</strong> 4111 1111 1111 1111</li>
                  <li>• <strong>Token:</strong> cnon:card-nonce-ok (sandbox only)</li>
                  <li>• Use any future expiry date and any CVV</li>
                </>
              )}
            </ul>
          </div>

          {/* Payment Component */}
          <div className="border rounded-lg p-4">
            <SquarePaymentComponent
              amount={1.00}
              onPaymentToken={handlePaymentToken}
              onError={handleError}
              isProcessing={isProcessing}
            />
          </div>

          {/* Results */}
          {paymentToken && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Payment Token Generated</span>
              </div>
              <code className="block p-2 bg-muted rounded text-xs">
                {paymentToken.substring(0, 50)}...
              </code>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {paymentResult && (
            <Alert className={paymentResult.success ? "border-green-500" : "border-red-500"}>
              <AlertTitle>
                {paymentResult.success ? 'Payment Successful' : 'Payment Failed'}
              </AlertTitle>
              <AlertDescription>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(paymentResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}