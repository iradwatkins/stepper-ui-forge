import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Wifi, Shield } from 'lucide-react';

interface DiagnosticResult {
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function SquareDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<Record<string, DiagnosticResult>>({
    environment: { status: 'pending', message: 'Checking environment configuration...' },
    network: { status: 'pending', message: 'Testing network connectivity...' },
    sdk: { status: 'pending', message: 'Loading Square SDK...' },
    initialization: { status: 'pending', message: 'Initializing Square payments...' },
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const updateDiagnostic = (key: string, result: DiagnosticResult) => {
    setDiagnostics(prev => ({ ...prev, [key]: result }));
  };

  const runDiagnostics = async () => {
    // 1. Check environment configuration
    const squareAppId = import.meta.env.VITE_SQUARE_APP_ID;
    const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
    const squareEnvironment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
    
    if (!squareAppId || !squareLocationId) {
      updateDiagnostic('environment', {
        status: 'error',
        message: 'Missing Square configuration',
        details: 'VITE_SQUARE_APP_ID or VITE_SQUARE_LOCATION_ID not set'
      });
      return;
    }

    updateDiagnostic('environment', {
      status: 'success',
      message: 'Environment configured correctly',
      details: `Environment: ${squareEnvironment}, App ID: ${squareAppId.substring(0, 15)}...`
    });

    // 2. Test network connectivity to Square CDN
    const startTime = Date.now();
    try {
      const cdnUrl = squareEnvironment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';
      
      const response = await fetch(cdnUrl, { method: 'HEAD' });
      const loadTime = Date.now() - startTime;
      
      if (response.ok) {
        updateDiagnostic('network', {
          status: loadTime > 3000 ? 'warning' : 'success',
          message: loadTime > 3000 ? 'Slow network detected' : 'Network connection good',
          details: `Square CDN responded in ${loadTime}ms`
        });
      } else {
        updateDiagnostic('network', {
          status: 'error',
          message: 'Cannot reach Square CDN',
          details: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      updateDiagnostic('network', {
        status: 'error',
        message: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }

    // 3. Load Square SDK
    try {
      const sdkStartTime = Date.now();
      const scriptUrl = squareEnvironment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      // Check if already loaded
      if (window.Square) {
        updateDiagnostic('sdk', {
          status: 'success',
          message: 'Square SDK already loaded',
          details: 'Using existing SDK instance'
        });
      } else {
        // Load SDK
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptUrl;
          script.async = true;
          script.defer = true;
          script.crossOrigin = 'anonymous';

          const timeout = setTimeout(() => {
            reject(new Error('SDK loading timeout (30s)'));
          }, 30000);

          script.onload = () => {
            clearTimeout(timeout);
            setTimeout(() => {
              if (window.Square) {
                resolve();
              } else {
                reject(new Error('Square object not available after load'));
              }
            }, 100);
          };

          script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load Square SDK'));
          };

          document.head.appendChild(script);
        });

        const sdkLoadTime = Date.now() - sdkStartTime;
        updateDiagnostic('sdk', {
          status: sdkLoadTime > 5000 ? 'warning' : 'success',
          message: sdkLoadTime > 5000 ? 'SDK loaded slowly' : 'Square SDK loaded successfully',
          details: `Load time: ${sdkLoadTime}ms`
        });
      }
    } catch (error) {
      updateDiagnostic('sdk', {
        status: 'error',
        message: 'Failed to load Square SDK',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }

    // 4. Initialize Square payments
    try {
      const initStartTime = Date.now();
      const payments = window.Square.payments(squareAppId, squareLocationId);
      
      // Try to create a card payment method as a test
      const card = await payments.card();
      
      const initTime = Date.now() - initStartTime;
      updateDiagnostic('initialization', {
        status: initTime > 3000 ? 'warning' : 'success',
        message: initTime > 3000 ? 'Slow initialization' : 'Square payments initialized',
        details: `Initialization time: ${initTime}ms`
      });

      // Clean up
      if (card.destroy) {
        card.destroy();
      }
    } catch (error) {
      updateDiagnostic('initialization', {
        status: 'error',
        message: 'Failed to initialize Square payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const allSuccess = Object.values(diagnostics).every(d => d.status === 'success');
  const hasErrors = Object.values(diagnostics).some(d => d.status === 'error');
  const hasWarnings = Object.values(diagnostics).some(d => d.status === 'warning');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Square Payment Diagnostics
        </CardTitle>
        <CardDescription>
          Checking Square payment system health and connectivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Square Payment Issues Detected</AlertTitle>
            <AlertDescription>
              One or more critical issues were found. Please check the details below.
            </AlertDescription>
          </Alert>
        )}
        
        {hasWarnings && !hasErrors && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Performance Issues Detected</AlertTitle>
            <AlertDescription>
              Square payments may be slow. This could be due to network conditions.
            </AlertDescription>
          </Alert>
        )}
        
        {allSuccess && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>All Systems Operational</AlertTitle>
            <AlertDescription>
              Square payment system is working correctly.
            </AlertDescription>
          </Alert>
        )}

        {/* Diagnostic Details */}
        <div className="space-y-3">
          {Object.entries(diagnostics).map(([key, result]) => (
            <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-sm text-muted-foreground">{result.message}</div>
                {result.details && (
                  <div className="text-xs text-muted-foreground mt-1">{result.details}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {(hasErrors || hasWarnings) && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Troubleshooting Steps:</h4>
            <ul className="text-sm space-y-1">
              {hasErrors && (
                <>
                  <li>• Check your internet connection</li>
                  <li>• Verify Square credentials are correct</li>
                  <li>• Try refreshing the page</li>
                  <li>• Check if ad blockers or security software are blocking Square</li>
                </>
              )}
              {hasWarnings && (
                <>
                  <li>• The payment form may take longer to load</li>
                  <li>• Consider trying again if the connection improves</li>
                </>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}