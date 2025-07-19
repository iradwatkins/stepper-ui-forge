import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function PaymentDebugTest() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

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
      // First, let's test the Square API directly to get better error info
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Test with a sandbox test token
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
              onClick={testSquarePayment} 
              disabled={loading === 'square'}
            >
              {loading === 'square' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Square Payment
            </Button>
          </CardContent>
        </Card>

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