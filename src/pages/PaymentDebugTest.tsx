import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';
import { Loader2, CheckCircle, XCircle, Smartphone, AlertCircle, CreditCard } from 'lucide-react';
import { getPaymentConfig } from '@/lib/payment-config';
import { CashAppPay } from '@/components/payment/CashAppPay';
import { CashAppPaySquareOnly } from '@/components/payment/CashAppPaySquareOnly';
import { SquarePaymentComponent } from '@/components/payment/SquarePaymentComponent';
import { SquareDiagnostics } from '@/components/payment/SquareDiagnostics';
import { SquareProductionTest } from '@/components/payment/SquareProductionTest';
import { CashAppPayComplete } from '@/components/payment/CashAppPayComplete';
import { CashAppPayDiagnostic } from '@/components/payment/CashAppPayDiagnostic';

export function PaymentDebugTest() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [showCashAppTest, setShowCashAppTest] = useState(false);
  const [showSquareTest, setShowSquareTest] = useState(false);
  const [showSquareDiagnostics, setShowSquareDiagnostics] = useState(false);
  const [showSquareProductionTest, setShowSquareProductionTest] = useState(false);
  const [showCashAppComplete, setShowCashAppComplete] = useState(false);
  const [cashAppToken, setCashAppToken] = useState<string | null>(null);
  const [showDollarTest, setShowDollarTest] = useState(false);

  const testHealthCheck = async () => {
    setLoading('health');
    try {
      const health = await productionPaymentService.checkGatewayHealth();
      setResults(prev => ({ ...prev, health }));
    } catch (error) {
      setResults(prev => ({ ...prev, health: { error: error.message } }));
    }
    setLoading(null);
  };

  const testPaymentMethods = async () => {
    setLoading('methods');
    try {
      const methods = await productionPaymentService.getAvailablePaymentMethods();
      setResults(prev => ({ ...prev, methods }));
    } catch (error) {
      setResults(prev => ({ ...prev, methods: { error: error.message } }));
    }
    setLoading(null);
  };

  const testPayPalPayment = async () => {
    setLoading('paypal');
    try {
      const result = await productionPaymentService.processPayment({
        amount: 1.00,
        gateway: 'paypal',
        orderId: `test_${Date.now()}`,
        customerEmail: 'test@example.com'
      });
      setResults(prev => ({ ...prev, paypal: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, paypal: { error: error.message } }));
    }
    setLoading(null);
  };

  const testSquarePayment = async () => {
    setLoading('square');
    try {
      // First check if we're in production or sandbox
      const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
      const isProduction = squareEnvironment === 'production';
      
      if (isProduction) {
        // In production, we can't use test tokens
        setResults(prev => ({ ...prev, square: { 
          warning: 'Cannot test with fake tokens in production',
          environment: squareEnvironment,
          message: 'Use the Square Payment Component below to generate a real payment token',
          note: 'Production Square API requires real payment tokens from the Web SDK'
        }}));
        setLoading(null);
        return;
      }
      
      // Only test with sandbox tokens if in sandbox mode
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const testResponse = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_payment',
          sourceId: 'cnon:card-nonce-ok', // Square sandbox test nonce
          amount: 1.00,
          currency: 'USD'
        })
      });
      
      const testData = await testResponse.json();
      
      if (!testResponse.ok) {
        setResults(prev => ({ ...prev, square: { 
          error: testData.error || 'Square API error',
          details: testData.details || {},
          status: testResponse.status,
          note: 'Check Supabase logs for detailed error',
          possibleCauses: [
            'Environment mismatch (sandbox token with production URL)',
            'Invalid access token or location ID',
            'Edge function not updated with better error handling'
          ]
        } }));
      } else {
        setResults(prev => ({ ...prev, square: { 
          success: true,
          data: testData 
        } }));
      }
    } catch (error) {
      setResults(prev => ({ ...prev, square: { 
        error: error.message || 'Square test failed',
        note: 'Network or configuration error'
      } }));
    }
    setLoading(null);
  };

  const testSquareHealth = async () => {
    setLoading('square-health');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${anonKey}` 
        }
      });
      
      const data = await response.json();
      
      setResults(prev => ({ ...prev, 'square-health': {
        ...data,
        httpStatus: response.status,
        timestamp: new Date().toISOString()
      }}));
    } catch (error) {
      setResults(prev => ({ ...prev, 'square-health': { 
        error: error.message || 'Health check failed'
      }}));
    }
    setLoading(null);
  };

  const testCashAppConfig = async () => {
    setLoading('cashapp-config');
    try {
      const config = getPaymentConfig();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Test Cash App edge function health
      const healthResponse = await fetch(`${supabaseUrl}/functions/v1/payments-cashapp`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${anonKey}` }
      });
      const healthData = await healthResponse.json();
      
      setResults(prev => ({ ...prev, 'cashapp-config': {
        frontend: {
          environment: config.cashapp.environment,
          clientId: config.cashapp.clientId ? 'Set (hidden)' : 'Not set',
          squareAppId: config.square.applicationId ? config.square.applicationId.substring(0, 15) + '...' : 'Not set',
          squareEnvironment: config.square.environment,
          squareLocationId: config.square.locationId ? 'Set' : 'Not set',
        },
        backend: healthData,
        sdkUrl: config.cashapp.environment === 'production' 
          ? 'https://kit.cash.app/v1/pay.js'
          : 'https://sandbox.kit.cash.app/v1/pay.js'
      }}));
    } catch (error) {
      setResults(prev => ({ ...prev, 'cashapp-config': { error: error.message } }));
    }
    setLoading(null);
  };

  const testCashAppPayment = async () => {
    if (!cashAppToken) {
      setResults(prev => ({ ...prev, 'cashapp-payment': { 
        error: 'No Cash App token available. Use the Cash App test component first.' 
      }}));
      return;
    }

    setLoading('cashapp-payment');
    try {
      const result = await productionPaymentService.processPayment({
        amount: 1.00,
        gateway: 'cashapp',
        sourceId: cashAppToken,
        orderId: `cashapp_test_${Date.now()}`,
        customerEmail: 'test@example.com'
      });
      setResults(prev => ({ ...prev, 'cashapp-payment': result }));
    } catch (error) {
      setResults(prev => ({ ...prev, 'cashapp-payment': { error: error.message } }));
    }
    setLoading(null);
  };

  const handleCashAppSuccess = (result: any) => {
    console.log('Cash App test success:', result);
    setResults(prev => ({ ...prev, 'cashapp-component': { 
      success: true, 
      result,
      timestamp: new Date().toISOString()
    }}));
  };

  const handleCashAppError = (error: string) => {
    console.error('Cash App test error:', error);
    setResults(prev => ({ ...prev, 'cashapp-component': { 
      error,
      timestamp: new Date().toISOString()
    }}));
  };

  const handleSquareToken = (token: string, method: 'card' | 'cashapp') => {
    if (method === 'cashapp') {
      setCashAppToken(token);
      setResults(prev => ({ ...prev, 'cashapp-token': { 
        token: token.substring(0, 20) + '...',
        method,
        timestamp: new Date().toISOString()
      }}));
    } else {
      setResults(prev => ({ ...prev, 'square-token': { 
        token: token.substring(0, 20) + '...',
        method,
        timestamp: new Date().toISOString()
      }}));
    }
  };

  const handleSquareError = (error: string) => {
    setResults(prev => ({ ...prev, 'square-component': { 
      error,
      timestamp: new Date().toISOString()
    }}));
  };

  const testEdgeFunctions = async () => {
    setLoading('edge');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const edgeResults: Record<string, any> = {};
    
    // Test PayPal
    try {
      const paypalResponse = await fetch(`${supabaseUrl}/functions/v1/payments-paypal`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${anonKey}` }
      });
      edgeResults.paypal = await paypalResponse.json();
    } catch (error) {
      edgeResults.paypal = { error: error.message };
    }
    
    // Test Square
    try {
      const squareResponse = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${anonKey}` }
      });
      edgeResults.square = await squareResponse.json();
    } catch (error) {
      edgeResults.square = { error: error.message };
    }
    
    // Test Cash App
    try {
      const cashappResponse = await fetch(`${supabaseUrl}/functions/v1/payments-cashapp`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${anonKey}` }
      });
      edgeResults.cashapp = await cashappResponse.json();
    } catch (error) {
      edgeResults.cashapp = { error: error.message };
    }
    
    setResults(prev => ({ ...prev, edge: edgeResults }));
    setLoading(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Payment System Debug</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>Run various payment system tests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={testHealthCheck} 
              disabled={loading === 'health'}
              className="mr-2"
            >
              {loading === 'health' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Health Check
            </Button>
            
            <Button 
              onClick={testPaymentMethods} 
              disabled={loading === 'methods'}
              className="mr-2"
            >
              {loading === 'methods' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Payment Methods
            </Button>
            
            <Button 
              onClick={testEdgeFunctions} 
              disabled={loading === 'edge'}
              className="mr-2"
            >
              {loading === 'edge' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Edge Functions
            </Button>
            
            <Button 
              onClick={testPayPalPayment} 
              disabled={loading === 'paypal'}
              className="mr-2"
            >
              {loading === 'paypal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test PayPal Payment
            </Button>
            
            <Button 
              onClick={testSquareHealth} 
              disabled={loading === 'square-health'}
              className="mr-2"
              variant="outline"
            >
              {loading === 'square-health' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Square Health
            </Button>
            
            <Button 
              onClick={testSquarePayment} 
              disabled={loading === 'square'}
              className="mr-2"
            >
              {loading === 'square' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Square Payment
            </Button>
            
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2">Cash App Pay Tests</h3>
              
              <Button 
                onClick={testCashAppConfig} 
                disabled={loading === 'cashapp-config'}
                className="mr-2 mb-2"
                variant="outline"
              >
                {loading === 'cashapp-config' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Smartphone className="mr-2 h-4 w-4" />
                Test Cash App Config
              </Button>
              
              <Button 
                onClick={() => setShowCashAppTest(!showCashAppTest)}
                className="mr-2 mb-2"
                variant="outline"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                {showCashAppTest ? 'Hide' : 'Show'} Cash App Component
              </Button>
              
              <Button 
                onClick={() => setShowSquareTest(!showSquareTest)}
                className="mr-2 mb-2"
                variant="outline"
              >
                {showSquareTest ? 'Hide' : 'Show'} Square SDK Test
              </Button>
              
              <Button 
                onClick={() => setShowSquareDiagnostics(!showSquareDiagnostics)}
                className="mb-2"
                variant="outline"
              >
                {showSquareDiagnostics ? 'Hide' : 'Show'} Square Diagnostics
              </Button>
              
              {cashAppToken && (
                <Button 
                  onClick={testCashAppPayment} 
                  disabled={loading === 'cashapp-payment'}
                  className="mb-2"
                  variant="default"
                >
                  {loading === 'cashapp-payment' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Process Cash App Payment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cash App Test Component */}
        {showCashAppTest && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Cash App Pay Test Component
              </CardTitle>
              <CardDescription>
                This uses the Cash App SDK directly to test the integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This component will attempt to load Cash App Pay. If you see an error about
                  "production client ID", it means Cash App requires a separate client ID.
                </AlertDescription>
              </Alert>
              <CashAppPay
                amount={1.00}
                orderId="debug_test_order"
                customerEmail="test@example.com"
                onSuccess={handleCashAppSuccess}
                onError={handleCashAppError}
              />
            </CardContent>
          </Card>
        )}

        {/* Square SDK Test Component */}
        {showSquareTest && (
          <Card>
            <CardHeader>
              <CardTitle>Square Web SDK Test</CardTitle>
              <CardDescription>
                Tests both Square card payments and Cash App Pay through Square SDK
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SquarePaymentComponent
                amount={1.00}
                onPaymentToken={handleSquareToken}
                onError={handleSquareError}
              />
            </CardContent>
          </Card>
        )}

        {/* Square Diagnostics */}
        {showSquareDiagnostics && (
          <SquareDiagnostics />
        )}

        {/* Square Production Test */}
        <Card>
          <CardHeader>
            <CardTitle>Square Production Payment Test</CardTitle>
            <CardDescription>
              Test Square payments with proper production/sandbox handling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowSquareProductionTest(!showSquareProductionTest)}
              variant="default"
            >
              {showSquareProductionTest ? 'Hide' : 'Show'} Production Test
            </Button>
          </CardContent>
        </Card>

        {showSquareProductionTest && (
          <SquareProductionTest />
        )}

        {/* Cash App Pay Complete Implementation */}
        <Card>
          <CardHeader>
            <CardTitle>Cash App Pay - Square SDK Only</CardTitle>
            <CardDescription>
              Clean implementation using ONLY Square's Web Payments SDK (no Cash App direct SDK)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowCashAppComplete(!showCashAppComplete)}
              variant="default"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              {showCashAppComplete ? 'Hide' : 'Show'} Clean Cash App Pay
            </Button>
          </CardContent>
        </Card>

        {showCashAppComplete && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Cash App Pay - Square SDK Only
              </CardTitle>
              <CardDescription>
                NO Cash App direct SDK loaded - using Square Web Payments SDK exclusively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashAppPaySquareOnly
                amount={10.80}
                orderId={`test_${Date.now()}`}
                customerEmail="test@example.com"
                onSuccess={(result) => {
                  console.log('Payment successful:', result);
                  setResults(prev => ({ ...prev, 'cashapp-square-only': { 
                    success: true, 
                    ...result,
                    timestamp: new Date().toISOString()
                  }}));
                }}
                onError={(error) => {
                  console.error('Payment error:', error);
                  setResults(prev => ({ ...prev, 'cashapp-square-only': { 
                    error,
                    timestamp: new Date().toISOString()
                  }}));
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Cash App Pay Diagnostic Tool */}
        <CashAppPayDiagnostic />

        {/* $1 Credit Card Test */}
        <Card>
          <CardHeader>
            <CardTitle>$1 Credit Card Test</CardTitle>
            <CardDescription>
              Test Square credit card payments with exactly $1.00 to debug loading issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowDollarTest(!showDollarTest)}
              variant="default"
            >
              {showDollarTest ? 'Hide' : 'Show'} $1 Test
            </Button>
          </CardContent>
        </Card>

        {showDollarTest && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                $1.00 Credit Card Test
              </CardTitle>
              <CardDescription>
                Enter test card details to verify Square payment processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Test Cards:</strong><br/>
                  • Visa: 4111 1111 1111 1111<br/>
                  • Mastercard: 5105 1051 0510 5100<br/>
                  • Use any future expiry date and any 3-digit CVV
                </AlertDescription>
              </Alert>
              <SquarePaymentComponent
                amount={1.00}
                onPaymentToken={(token, method) => {
                  console.log('$1 Test Payment Token:', { token, method });
                  setResults(prev => ({ ...prev, 'dollar-test': { 
                    success: true,
                    token: token.substring(0, 20) + '...',
                    method,
                    amount: 1.00,
                    timestamp: new Date().toISOString()
                  }}));
                }}
                onError={(error) => {
                  console.error('$1 Test Payment Error:', error);
                  setResults(prev => ({ ...prev, 'dollar-test': { 
                    error,
                    amount: 1.00,
                    timestamp: new Date().toISOString()
                  }}));
                }}
              />
            </CardContent>
          </Card>
        )}

        {Object.entries(results).map(([key, value]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {key.charAt(0).toUpperCase() + key.slice(1)} Results
                {value.error ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-auto max-h-96 text-xs">
                {JSON.stringify(value, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default PaymentDebugTest;