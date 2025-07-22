import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, AlertCircle, Shield, CheckCircle } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
  }
}

export function SquareCreditCardTest() {
  const [status, setStatus] = useState<string>('not-started');
  const [error, setError] = useState<string | null>(null);
  const [cardAttached, setCardAttached] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[Square CC Test] ${message}`);
  };

  const initializeSquare = async () => {
    setStatus('initializing');
    setError(null);
    setToken(null);
    setLogs([]);
    addLog('Starting Square credit card initialization...');

    try {
      // Step 1: Check environment variables
      const appId = import.meta.env.VITE_SQUARE_APP_ID;
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';

      addLog(`Environment: ${environment}`);
      addLog(`App ID: ${appId ? appId.substring(0, 20) + '...' : 'NOT SET'}`);
      addLog(`Location ID: ${locationId || 'NOT SET'}`);

      if (!appId || !locationId) {
        throw new Error('Missing Square credentials. Please set VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID');
      }

      // Step 2: Load Square SDK
      const sdkUrl = environment === 'production' 
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      addLog(`Loading Square SDK from: ${sdkUrl}`);

      if (!window.Square) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = sdkUrl;
          script.onload = () => {
            addLog('Square SDK loaded successfully');
            resolve(true);
          };
          script.onerror = () => {
            addLog('Failed to load Square SDK');
            reject(new Error('Failed to load Square SDK'));
          };
          document.head.appendChild(script);
        });
      } else {
        addLog('Square SDK already loaded');
      }

      // Step 3: Initialize Square payments
      addLog('Initializing Square payments object...');
      const payments = window.Square.payments(appId, locationId);
      addLog('Square payments object created');

      // Step 4: Create card payment method
      addLog('Creating card payment method...');
      const card = await payments.card();
      setCardElement(card);
      addLog('Card payment method created');

      // Step 5: Check container exists
      const container = document.getElementById('square-test-container');
      if (!container) {
        throw new Error('Container element not found');
      }
      addLog('Container element found');

      // Step 6: Attach card to container
      addLog('Attaching card form to container...');
      await card.attach('#square-test-container');
      setCardAttached(true);
      addLog('✅ Card form attached successfully!');
      setStatus('ready');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`❌ Error: ${errorMessage}`);
      setError(errorMessage);
      setStatus('error');
    }
  };

  const tokenizeCard = async () => {
    if (!cardElement) {
      setError('Card element not initialized');
      return;
    }

    setStatus('tokenizing');
    addLog('Starting card tokenization...');

    try {
      const result = await cardElement.tokenize();
      
      if (result.status === 'OK') {
        addLog('✅ Tokenization successful!');
        addLog(`Token: ${result.token.substring(0, 30)}...`);
        setToken(result.token);
        setStatus('success');
      } else {
        const errorMsg = result.errors?.[0]?.message || 'Tokenization failed';
        addLog(`❌ Tokenization error: ${errorMsg}`);
        setError(errorMsg);
        setStatus('error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tokenization failed';
      addLog(`❌ Exception: ${errorMessage}`);
      setError(errorMessage);
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('not-started');
    setError(null);
    setCardAttached(false);
    setCardElement(null);
    setToken(null);
    setLogs([]);
    // Reload page to fully reset
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Square Credit Card Test
          </div>
          <Badge variant={status === 'ready' || status === 'success' ? 'default' : 'secondary'}>
            {status.toUpperCase().replace('-', ' ')}
          </Badge>
        </CardTitle>
        <CardDescription>
          Step-by-step test of Square credit card initialization and tokenization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Info */}
        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium">Environment Status:</span>
          </div>
          <div className="ml-6 space-y-0.5 text-xs">
            <div>Mode: {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'}</div>
            <div>App ID: {import.meta.env.VITE_SQUARE_APP_ID ? '✓ Configured' : '✗ Missing'}</div>
            <div>Location ID: {import.meta.env.VITE_SQUARE_LOCATION_ID ? '✓ Configured' : '✗ Missing'}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === 'not-started' && (
            <Button onClick={initializeSquare}>
              Initialize Square
            </Button>
          )}
          
          {status === 'ready' && (
            <Button onClick={tokenizeCard}>
              Test Tokenization
            </Button>
          )}

          {(status === 'error' || status === 'success') && (
            <Button onClick={reset} variant="outline">
              Reset Test
            </Button>
          )}

          {(status === 'initializing' || status === 'tokenizing') && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </Button>
          )}
        </div>

        {/* Card Container */}
        {(status !== 'not-started' && status !== 'error') && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Credit Card Form:</label>
            <div 
              id="square-test-container"
              className="border rounded-lg p-4 min-h-[120px] bg-background"
            >
              {!cardAttached && (
                <div className="flex items-center justify-center h-[80px] text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading card form...
                </div>
              )}
            </div>
            {cardAttached && (
              <div className="text-xs text-muted-foreground">
                Enter test card: 4111 1111 1111 1111, any future date, any CVV
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {token && (
          <Alert className="border-green-600 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>Success!</strong> Token generated: {token.substring(0, 30)}...
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Logs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Debug Logs:</label>
          <div className="bg-muted p-3 rounded-lg max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No logs yet. Click "Initialize Square" to start.</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
          <p className="font-medium">Troubleshooting:</p>
          <ul className="ml-4 space-y-0.5">
            <li>• Check browser console (F12) for additional errors</li>
            <li>• Disable ad blockers and privacy extensions</li>
            <li>• Ensure you're on HTTPS in production</li>
            <li>• Verify Square credentials are correct</li>
            <li>• Try incognito/private browsing mode</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}