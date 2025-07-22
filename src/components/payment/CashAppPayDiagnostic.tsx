import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Smartphone, Info, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    Square: any;
  }
}

interface DiagnosticStep {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
}

export function CashAppPayDiagnostic() {
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { name: 'Environment Check', status: 'pending' },
    { name: 'Square SDK Loading', status: 'pending' },
    { name: 'Square Payments Initialization', status: 'pending' },
    { name: 'Cash App Pay Creation', status: 'pending' },
    { name: 'DOM Container Check', status: 'pending' },
    { name: 'Button Attachment', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [cashAppPay, setCashAppPay] = useState<any>(null);

  const updateStep = (index: number, update: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...update } : step
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    // Clean up any existing instance
    if (cashAppPay?.destroy) {
      cashAppPay.destroy();
      setCashAppPay(null);
    }

    // Reset all steps
    setSteps(steps.map(step => ({ ...step, status: 'pending', message: undefined, details: undefined })));

    try {
      // Step 1: Environment Check
      updateStep(0, { status: 'checking' });
      const appId = import.meta.env.VITE_SQUARE_APP_ID;
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
      const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
      
      if (!appId || !locationId) {
        updateStep(0, { 
          status: 'error', 
          message: 'Missing Square credentials',
          details: { appId: !!appId, locationId: !!locationId }
        });
        return;
      }
      
      updateStep(0, { 
        status: 'success', 
        message: `${environment} environment`,
        details: {
          appId: appId.substring(0, 15) + '...',
          locationId,
          environment
        }
      });

      // Step 2: Square SDK Loading
      updateStep(1, { status: 'checking' });
      const sdkUrl = environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      if (!window.Square) {
        await loadSquareSDK(sdkUrl);
      }
      
      updateStep(1, { 
        status: 'success', 
        message: 'Square SDK loaded',
        details: { sdkUrl, version: window.Square?.version }
      });

      // Step 3: Square Payments Initialization
      updateStep(2, { status: 'checking' });
      const payments = window.Square.payments({
        applicationId: appId,
        locationId: locationId
      });
      
      if (!payments) {
        throw new Error('Failed to initialize Square payments');
      }
      
      updateStep(2, { 
        status: 'success', 
        message: 'Square payments initialized',
        details: { methods: Object.keys(payments) }
      });

      // Step 4: Cash App Pay Creation
      updateStep(3, { status: 'checking' });
      
      // Create payment request
      const paymentRequest = payments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: '1.00',
          label: 'Test Payment'
        }
      });

      const cashApp = await payments.cashAppPay(paymentRequest, {
        redirectURL: window.location.href,
        referenceId: `test-${Date.now()}`
      });
      
      if (!cashApp) {
        throw new Error('Failed to create Cash App Pay instance');
      }
      
      setCashAppPay(cashApp);
      updateStep(3, { 
        status: 'success', 
        message: 'Cash App Pay instance created',
        details: { 
          methods: Object.keys(cashApp),
          hasAttach: typeof cashApp.attach === 'function',
          hasDestroy: typeof cashApp.destroy === 'function'
        }
      });

      // Step 5: DOM Container Check
      updateStep(4, { status: 'checking' });
      const container = document.getElementById('diagnostic-cash-app-container');
      
      if (!container) {
        updateStep(4, { 
          status: 'error', 
          message: 'Container element not found',
          details: { elementId: 'diagnostic-cash-app-container' }
        });
        return;
      }
      
      updateStep(4, { 
        status: 'success', 
        message: 'Container element found',
        details: { 
          elementId: container.id,
          className: container.className,
          minHeight: container.style.minHeight || 'not set'
        }
      });

      // Step 6: Button Attachment
      updateStep(5, { status: 'checking' });
      
      // Clear container first
      container.innerHTML = '';
      
      await cashApp.attach('#diagnostic-cash-app-container');
      
      // Check if button was actually attached
      const hasButton = container.children.length > 0;
      
      if (!hasButton) {
        updateStep(5, { 
          status: 'warning', 
          message: 'Button attached but may not be visible',
          details: { childrenCount: container.children.length }
        });
      } else {
        updateStep(5, { 
          status: 'success', 
          message: 'Cash App Pay button attached',
          details: { 
            childrenCount: container.children.length,
            firstChildTag: container.children[0]?.tagName
          }
        });
      }

      // Set up event listeners
      cashApp.addEventListener('ready', () => {
        console.log('Cash App Pay ready event fired');
      });

      cashApp.addEventListener('ontokenization', (event: any) => {
        console.log('Cash App Pay tokenization event:', event.detail);
        alert('Payment token received! Check console for details.');
      });

    } catch (error) {
      console.error('Diagnostic error:', error);
      const failedStep = steps.findIndex(s => s.status === 'checking');
      if (failedStep !== -1) {
        updateStep(failedStep, { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error',
          details: { error: String(error) }
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const loadSquareSDK = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing && window.Square) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;

      const timeout = setTimeout(() => {
        reject(new Error('Square SDK loading timeout (30s)'));
      }, 30000);

      script.onload = () => {
        clearTimeout(timeout);
        setTimeout(() => {
          if (window.Square) {
            resolve();
          } else {
            reject(new Error('Square SDK loaded but not available'));
          }
        }, 100);
      };

      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Square SDK'));
      };

      document.head.appendChild(script);
    });
  };

  const getStepIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const allSuccess = steps.every(s => s.status === 'success');
  const hasErrors = steps.some(s => s.status === 'error');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Cash App Pay Diagnostic
        </CardTitle>
        <CardDescription>
          Step-by-step diagnostic to identify Cash App Pay integration issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Button */}
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          variant={hasErrors ? 'destructive' : 'default'}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Diagnostics
            </>
          )}
        </Button>

        {/* Diagnostic Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              {getStepIcon(step.status)}
              <div className="flex-1">
                <div className="font-medium">{step.name}</div>
                {step.message && (
                  <div className="text-sm text-muted-foreground">{step.message}</div>
                )}
                {step.details && (
                  <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(step.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Test Container */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">Cash App Pay Button Container:</div>
          <div 
            id="diagnostic-cash-app-container" 
            className="min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg"
            style={{ minHeight: '60px' }}
          >
            {!isRunning && !cashAppPay && (
              <div className="flex items-center justify-center h-[60px] text-sm text-muted-foreground">
                Run diagnostics to load Cash App Pay button
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {!isRunning && (allSuccess || hasErrors) && (
          <Alert className={allSuccess ? 'border-green-500' : 'border-red-500'}>
            <AlertTitle>
              {allSuccess ? 'All Checks Passed!' : 'Issues Detected'}
            </AlertTitle>
            <AlertDescription>
              {allSuccess ? (
                'Cash App Pay is properly configured and ready to use. Try clicking the button above to test payment flow.'
              ) : (
                'Please review the errors above and fix the configuration issues.'
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Environment Info */}
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-2">
            {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'}
          </Badge>
          <span>Square SDK: {window.Square ? 'Loaded' : 'Not Loaded'}</span>
        </div>
      </CardContent>
    </Card>
  );
}