import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

declare global {
  interface Window {
    Square: any;
  }
}

export function SquareInitDebug() {
  const [status, setStatus] = useState<string>('Not initialized');
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // Check if SDK is already loaded
    if (window.Square) {
      setSdkLoaded(true);
    }
  }, []);

  const loadSDK = async () => {
    if (window.Square) {
      setSdkLoaded(true);
      return;
    }

    try {
      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          setSdkLoaded(true);
          resolve(true);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (err) {
      setError('Failed to load Square SDK');
    }
  };

  const testInit = async () => {
    setError(null);
    setStatus('Testing...');

    try {
      // Hardcoded credentials for testing
      const applicationId = 'sq0idp-XG8irNWHf98C62-iqOwH6Q';
      const locationId = 'L0Q2YC1SPBGD8';

      console.log('Testing with credentials:', {
        applicationId,
        locationId,
        appIdLength: applicationId.length,
        locIdLength: locationId.length
      });

      // Try initialization
      const payments = window.Square.payments({
        applicationId: applicationId,
        locationId: locationId
      });

      console.log('Success! Payments object:', payments);
      setStatus('✅ Initialized successfully');

      // Try to create a card form
      const card = await payments.card();
      console.log('Card form created:', card);
      
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message || 'Unknown error');
      setStatus('❌ Failed');
      
      // Log more details
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Square SDK Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <strong>SDK Loaded:</strong> {sdkLoaded ? '✅ Yes' : '❌ No'}
          </p>
          <p className="text-sm">
            <strong>Status:</strong> {status}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {!sdkLoaded && (
            <Button onClick={loadSDK} variant="outline" size="sm">
              Load SDK
            </Button>
          )}
          
          <Button 
            onClick={testInit} 
            disabled={!sdkLoaded}
            size="sm"
          >
            Test Initialization
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Credentials being tested:</p>
          <code className="block mt-1">
            App ID: sq0idp-XG8irNWHf98C62-iqOwH6Q<br/>
            Location: L0Q2YC1SPBGD8
          </code>
        </div>
      </CardContent>
    </Card>
  );
}