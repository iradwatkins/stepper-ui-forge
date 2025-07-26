import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
  }
}

export function SquareCardMinimal() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSquare = async () => {
      try {
        // Get credentials
        const appId = import.meta.env.VITE_SQUARE_APP_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
        
        console.log('[Minimal] Square Config:', { appId: appId?.slice(0,10), locationId, environment });
        
        if (!appId || !locationId) {
          throw new Error('Missing Square credentials');
        }

        // Load SDK
        if (!window.Square) {
          const script = document.createElement('script');
          script.src = environment === 'production' 
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js';
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          
          // Wait for Square to be available
          let count = 0;
          while (!window.Square && count < 30) {
            await new Promise(r => setTimeout(r, 100));
            count++;
          }
        }

        if (!window.Square) {
          throw new Error('Square SDK failed to load');
        }

        console.log('[Minimal] Square SDK loaded');

        // Initialize payments
        const payments = window.Square.payments(appId, locationId);
        console.log('[Minimal] Payments initialized');

        // Create card
        const card = await payments.card();
        console.log('[Minimal] Card created');

        // Wait for container to be ready (same pattern as CashApp/Square fix)
        const waitForContainer = async (maxAttempts = 10): Promise<string> => {
          const containerIds = ['square-minimal-container', 'square-card-container', 'card-container'];
          
          for (let i = 0; i < maxAttempts; i++) {
            for (const id of containerIds) {
              const element = document.getElementById(id);
              if (element && document.contains(element)) {
                return id;
              }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          throw new Error('No valid container found after maximum attempts');
        };
        
        const containerId = await waitForContainer();
        console.log(`[Minimal] ✅ Container found: #${containerId}`);
        
        await card.attach(`#${containerId}`);
        console.log(`[Minimal] ✅ Card attached to #${containerId}`);

        setStatus('ready');
        
        // Store card instance globally for debugging
        (window as any).__squareCard = card;
        console.log('[Minimal] Card instance stored as window.__squareCard');
        
      } catch (err: any) {
        console.error('[Minimal] Error:', err);
        setError(err.message || 'Failed to initialize');
        setStatus('error');
      }
    };

    initSquare();
  }, []);

  const testTokenize = async () => {
    try {
      const card = (window as any).__squareCard;
      if (!card) {
        throw new Error('Card not initialized');
      }
      
      const result = await card.tokenize();
      console.log('[Minimal] Tokenize result:', result);
      
      if (result.status === 'OK') {
        alert(`Success! Token: ${result.token.substring(0, 30)}...`);
      } else {
        alert(`Error: ${result.errors?.[0]?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('[Minimal] Tokenize error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <Card className="border-2 border-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Square Card Minimal Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          Status: <span className="font-mono">{status}</span>
        </div>
        
        {/* Primary container */}
        <div 
          id="square-minimal-container"
          className="border-2 border-red-500 rounded p-4 min-h-[150px] bg-gray-50"
        >
          {status === 'loading' && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-500 text-center">
              Container ready but card failed to attach
            </div>
          )}
        </div>

        {/* Fallback containers */}
        <div id="square-card-container" className="hidden"></div>
        <div id="card-container" className="hidden"></div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === 'ready' && (
          <Button onClick={testTokenize} className="w-full">
            Test Tokenization
          </Button>
        )}

        {/* Debug info */}
        <div className="text-xs space-y-1 p-2 bg-muted rounded">
          <div>Square loaded: {window.Square ? 'Yes' : 'No'}</div>
          <div>Environment: {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'}</div>
          <div>Container exists: {!!document.getElementById('square-minimal-container') ? 'Yes' : 'No'}</div>
          <div>
            Check console for logs (filter by "[Minimal]")
          </div>
        </div>
      </CardContent>
    </Card>
  );
}