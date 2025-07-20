import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, Smartphone, CreditCard, AlertCircle } from 'lucide-react';
import { CashAppPaySquareOnly } from '@/components/payment/CashAppPaySquareOnly';

export function CashAppPayImplementation() {
  const [paymentResults, setPaymentResults] = useState<any[]>([]);
  
  // Test order details
  const orderDetails = {
    items: [
      { name: 'Sample Product', price: 10.00 },
      { name: 'Tax', price: 0.80 }
    ],
    total: 10.80
  };

  const handlePaymentSuccess = (result: any) => {
    console.log('Payment successful:', result);
    setPaymentResults(prev => [...prev, { 
      success: true, 
      ...result, 
      timestamp: new Date().toISOString() 
    }]);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setPaymentResults(prev => [...prev, { 
      success: false, 
      error, 
      timestamp: new Date().toISOString() 
    }]);
  };

  const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
  const isProduction = environment === 'production';

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Cash App Pay Integration</h1>

      {/* Environment Badge */}
      <div className="mb-4 flex justify-center">
        <Badge variant={isProduction ? 'default' : 'secondary'} className="text-sm">
          {environment.toUpperCase()} ENVIRONMENT
        </Badge>
      </div>

      {/* Important Notice */}
      <Alert className="mb-6 border-blue-500">
        <Info className="h-4 w-4" />
        <AlertTitle>Square SDK Implementation</AlertTitle>
        <AlertDescription>
          This implementation uses ONLY Square's Web Payments SDK for Cash App Pay. 
          No separate Cash App SDK is loaded. Your Square Application ID works for both 
          card payments and Cash App Pay.
        </AlertDescription>
      </Alert>

      {isProduction && (
        <Alert className="mb-6 border-orange-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Production Mode Active</AlertTitle>
          <AlertDescription>
            You are using production Square credentials. Any payments made will be real transactions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>${item.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 font-semibold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>${orderDetails.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash App Pay Component */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pay with Cash App
            </CardTitle>
            <CardDescription>
              Using Square Web Payments SDK - No separate Cash App SDK needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CashAppPaySquareOnly
              amount={orderDetails.total}
              orderId={`demo_${Date.now()}`}
              customerEmail="test@example.com"
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </CardContent>
        </Card>

        {/* Payment Results */}
        {paymentResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Results</CardTitle>
              <CardDescription>
                Transaction history for this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paymentResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="font-medium">
                      {result.success ? '✅ Success' : '❌ Failed'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.timestamp}
                    </div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">{result.error}</div>
                    )}
                    {result.data?.transactionId && (
                      <div className="text-sm mt-1">
                        Transaction: {result.data.transactionId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Implementation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Clean Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">What's Different:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>NO Cash App direct SDK (kit.cash.app) - removed completely</li>
                <li>ONLY Square's Web Payments SDK is loaded</li>
                <li>Single initialization flow - no duplicate instances</li>
                <li>Proper cleanup on component unmount</li>
                <li>Uses Square Application ID for Cash App Pay</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">SDK Flow:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Load Square Web SDK (web.squarecdn.com)</li>
                <li>Initialize Square.payments() once</li>
                <li>Create payments.cashAppPay() instance once</li>
                <li>Attach to DOM element</li>
                <li>Handle tokenization events</li>
                <li>Process payment on backend</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Current Configuration:</h4>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <p>Environment: {environment}</p>
                <p>Square App ID: {import.meta.env.VITE_SQUARE_APP_ID?.substring(0, 15)}...</p>
                <p>Location: {import.meta.env.VITE_SQUARE_LOCATION_ID}</p>
                <p>SDK: Square Web Payments SDK only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CashAppPayImplementation;