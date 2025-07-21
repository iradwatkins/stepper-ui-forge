import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SquareDirectTest() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const testDirectSquareAPI = async () => {
    setIsProcessing(true);
    setStatus('Testing direct Square API call...');
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-square`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_payment',
          sourceId: 'cnon:card-nonce-ok', // Square sandbox test token
          amount: 1, // $1.00 in dollars
          currency: 'USD'
        }),
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        setError(`Invalid JSON response: ${responseText}`);
        return;
      }

      console.log('Square API Response:', {
        status: response.status,
        data
      });
      
      if (response.ok) {
        setStatus(`✅ Payment successful: ${JSON.stringify(data, null, 2)}`);
      } else {
        setError(`Square API Error (${response.status}):\n${JSON.stringify(data, null, 2)}`);
        
        // Log specific error details
        if (data.details) {
          console.error('Error details:', data.details);
        }
        if (data.error) {
          console.error('Error message:', data.error);
        }
      }
    } catch (err) {
      console.error('Test error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const testWithRealToken = async () => {
    setStatus('To test with a real token:\n1. Use the checkout flow to get a real payment token\n2. Check console for the token\n3. We can then test directly with that token');
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Square Direct API Test</CardTitle>
          <CardDescription>
            Test Square API directly to see exact error messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={testDirectSquareAPI}
              disabled={isProcessing}
              className="w-full"
            >
              Test with Sandbox Token (cnon:card-nonce-ok)
            </Button>
            
            <Button 
              onClick={testWithRealToken}
              disabled={isProcessing}
              variant="outline"
              className="w-full"
            >
              Instructions for Real Token Test
            </Button>
          </div>

          {status && (
            <Alert>
              <AlertDescription className="whitespace-pre-wrap font-mono text-xs">
                {status}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-wrap font-mono text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Environment: {import.meta.env.VITE_SQUARE_ENVIRONMENT}</p>
            <p className="text-yellow-600 font-semibold">
              Note: Square Production API does NOT accept test tokens.
            </p>
            <p>
              You need to use real card details in production mode.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}