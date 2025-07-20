import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';
import { SquarePaymentSimple } from '@/components/payments/SquarePaymentSimple';

export default function SquarePaymentDebug() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [squareToken, setSquareToken] = useState('');
  const [showSquareForm, setShowSquareForm] = useState(false);

  const testSquareEndpoint = async () => {
    setIsProcessing(true);
    setStatus('Testing Square endpoint...');
    setError('');

    try {
      // Test with a dummy token
      const result = await productionPaymentService.processPayment({
        gateway: 'square',
        amount: 100, // $1.00
        orderId: `test_${Date.now()}`,
        customerEmail: 'test@example.com',
        sourceId: squareToken || 'cnon:card-nonce-ok', // Use real token if available
        items: [{
          ticketTypeId: 'test',
          eventId: 'test',
          quantity: 1,
          price: 100,
          title: 'Test Ticket'
        }]
      });

      console.log('Payment result:', result);
      
      if (result.success) {
        setStatus('✅ Payment successful!');
      } else {
        setError(`Payment failed: ${result.error}`);
        console.error('Payment error:', result);
      }
    } catch (err) {
      console.error('Test error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const testHealthCheck = async () => {
    setIsProcessing(true);
    setStatus('Checking Square gateway health...');
    setError('');

    try {
      const availableGateways = await productionPaymentService.getAvailablePaymentMethods();
      console.log('Available gateways:', availableGateways);
      
      const squareAvailable = availableGateways.some(g => g.id === 'square' && g.available);
      
      if (squareAvailable) {
        setStatus('✅ Square gateway is healthy');
      } else {
        setError('❌ Square gateway is not available');
      }
    } catch (err) {
      console.error('Health check error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const testDirectEdgeFunction = async () => {
    setIsProcessing(true);
    setStatus('Testing direct edge function call...');
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Use GET for health check
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      console.log('Edge function response:', response);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Edge function data:', data);
        
        // Extract the application ID from the response
        if (data.configStatus?.hasApplicationId) {
          window.EDGE_FUNCTION_APP_ID = data.applicationId;
        }
        
        setStatus(`✅ Edge function is working:\n${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        setError(`Edge function error (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error('Direct test error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSquareToken = (token: string) => {
    setSquareToken(token);
    setStatus(`✅ Got Square token: ${token.substring(0, 30)}...`);
    setShowSquareForm(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Square Payment Debug</CardTitle>
          <CardDescription>
            Test Square payment integration and edge functions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={testHealthCheck}
              disabled={isProcessing}
              className="w-full"
            >
              Test Square Health Check
            </Button>
            
            <Button 
              onClick={testDirectEdgeFunction}
              disabled={isProcessing}
              variant="secondary"
              className="w-full"
            >
              Test Direct Edge Function
            </Button>
            
            <Button 
              onClick={() => setShowSquareForm(true)}
              disabled={isProcessing}
              variant="outline"
              className="w-full"
            >
              Get Real Payment Token
            </Button>
            
            <Button 
              onClick={testSquareEndpoint}
              disabled={isProcessing || !squareToken}
              variant="default"
              className="w-full"
            >
              {squareToken 
                ? 'Test Square Payment with Real Token ($1.00)'
                : 'Get a payment token first'
              }
            </Button>
          </div>

          {squareToken && (
            <div className="p-3 bg-muted rounded-lg">
              <Label>Current Token:</Label>
              <div className="font-mono text-xs break-all">{squareToken}</div>
            </div>
          )}

          {status && (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Environment: {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'}</p>
            <p>Square App ID: {import.meta.env.VITE_SQUARE_APP_ID?.substring(0, 20)}...</p>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
            <p className="text-yellow-600">
              ⚠️ Note: You're in PRODUCTION mode. Test tokens won't work.
            </p>
          </div>
        </CardContent>
      </Card>

      {showSquareForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Real Payment Token</CardTitle>
            <CardDescription>
              Enter card details to generate a real token for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SquarePaymentSimple
              amount={1.00}
              onPaymentToken={handleSquareToken}
              onError={setError}
              isProcessing={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}