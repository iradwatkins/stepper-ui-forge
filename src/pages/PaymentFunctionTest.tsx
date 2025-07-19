import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PaymentFunctionTest() {
  const [paypalStatus, setPaypalStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [squareStatus, setSquareStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [paypalResult, setPaypalResult] = useState<any>(null);
  const [squareResult, setSquareResult] = useState<any>(null);

  const testPayPalFunction = async () => {
    setPaypalStatus('testing');
    setPaypalResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Test health check
      const healthResponse = await fetch(`${supabaseUrl}/functions/v1/payments-paypal`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }

      const healthData = await healthResponse.json();
      
      // Test order creation
      const orderResponse = await fetch(`${supabaseUrl}/functions/v1/payments-paypal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_order',
          amount: 10.00,
          currency: 'USD'
        }),
      });

      const orderData = await orderResponse.json();

      setPaypalResult({
        health: healthData,
        orderCreation: {
          status: orderResponse.status,
          data: orderData
        }
      });

      setPaypalStatus(orderResponse.ok ? 'success' : 'error');
    } catch (error) {
      setPaypalResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setPaypalStatus('error');
    }
  };

  const testSquareFunction = async () => {
    setSquareStatus('testing');
    setSquareResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Test health check
      const healthResponse = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }

      const healthData = await healthResponse.json();
      
      // Test payment creation with sandbox test nonce
      const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_payment',
          sourceId: 'cnon:card-nonce-ok', // Square sandbox test nonce
          amount: 10.00,
          currency: 'USD'
        }),
      });

      const paymentData = await paymentResponse.json();

      setSquareResult({
        health: healthData,
        paymentCreation: {
          status: paymentResponse.status,
          data: paymentData
        }
      });

      setSquareStatus(paymentResponse.ok ? 'success' : 'error');
    } catch (error) {
      setSquareResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setSquareStatus('error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
      case 'testing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Payment Function Test</h1>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Test Environment</AlertTitle>
        <AlertDescription>
          This page tests the Supabase Edge Functions for PayPal and Square payments. 
          These tests use sandbox/test credentials and won't process real payments.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PayPal Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              PayPal Function Test
              {getStatusIcon(paypalStatus)}
            </CardTitle>
            <CardDescription>
              Tests the payments-paypal Edge Function
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testPayPalFunction} 
              disabled={paypalStatus === 'testing'}
              className="w-full"
            >
              {paypalStatus === 'testing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test PayPal Function'
              )}
            </Button>
            
            {paypalResult && (
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm">Results:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(paypalResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Square Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Square Function Test
              {getStatusIcon(squareStatus)}
            </CardTitle>
            <CardDescription>
              Tests the payments-square Edge Function
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testSquareFunction} 
              disabled={squareStatus === 'testing'}
              className="w-full"
            >
              {squareStatus === 'testing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Square Function'
              )}
            </Button>
            
            {squareResult && (
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm">Results:</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(squareResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Alert>
          <AlertTitle>Troubleshooting</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>If tests fail, check:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Edge Functions are deployed: <code>supabase functions deploy</code></li>
              <li>Environment variables are set in Supabase dashboard</li>
              <li>API credentials are valid for the configured environment</li>
              <li>CORS headers are properly configured</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}