import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export function CashAppPayDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<{
    environment: string;
    clientId: string;
    squareLoaded: boolean;
    cashAppPayAvailable: boolean;
    cashAppPayError?: string;
    initializationAttempted: boolean;
  }>({
    environment: '',
    clientId: '',
    squareLoaded: false,
    cashAppPayAvailable: false,
    initializationAttempted: false
  });

  useEffect(() => {
    loadDiagnosticInfo();
  }, []);

  const loadDiagnosticInfo = () => {
    const environment = import.meta.env.VITE_CASHAPP_ENVIRONMENT || 'sandbox';
    const clientId = import.meta.env.VITE_CASHAPP_CLIENT_ID || '';
    const squareLoaded = typeof window !== 'undefined' && !!window.Square;

    setDiagnostics({
      environment,
      clientId,
      squareLoaded,
      cashAppPayAvailable: false,
      initializationAttempted: false
    });

    console.log('💳 Cash App Pay Diagnostic Info:', {
      environment,
      clientId: clientId.substring(0, 15) + '...',
      squareLoaded,
      windowSquareExists: !!window.Square
    });
  };

  const testCashAppPayInitialization = async () => {
    try {
      setDiagnostics(prev => ({ ...prev, initializationAttempted: true, cashAppPayError: undefined }));

      // Load Square SDK first if not loaded
      if (!window.Square) {
        await loadSquareSDK();
      }

      if (!window.Square) {
        throw new Error('Square SDK failed to load');
      }

      console.log('✅ Square SDK loaded, initializing payments...');

      // Initialize Square payments
      const payments = window.Square.payments(
        diagnostics.clientId,
        import.meta.env.VITE_SQUARE_LOCATION_ID
      );

      console.log('✅ Square payments initialized, testing Cash App Pay...');

      // Test Cash App Pay availability using the correct Square Web SDK methods
      console.log('🔍 Available Square payments methods:', Object.keys(payments));
      
      let cashAppAvailable = false;
      let testErrors = [];
      
      // Method 1: Try PaymentRequest API (recommended by Square)
      if (typeof payments.paymentRequest === 'function') {
        try {
          console.log('🔄 Testing PaymentRequest API for Cash App Pay...');
          
          const paymentRequest = payments.paymentRequest({
            countryCode: 'US',
            currencyCode: 'USD',
            total: {
              amount: '100', // $1.00 in cents
              label: 'Test Payment'
            },
            requestPayerName: false,
            requestPayerPhone: false,
            requestPayerEmail: false,
            requestShipping: false
          });
          
          if (paymentRequest && typeof paymentRequest.canMakePayment === 'function') {
            const canMakePayment = await paymentRequest.canMakePayment();
            if (canMakePayment) {
              cashAppAvailable = true;
              console.log('✅ Cash App Pay available via PaymentRequest API');
            } else {
              testErrors.push('PaymentRequest: canMakePayment() returned false');
              console.warn('⚠️ PaymentRequest canMakePayment returned false');
            }
          } else {
            testErrors.push('PaymentRequest: created but canMakePayment method missing');
            console.warn('⚠️ PaymentRequest created but canMakePayment not available');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          testErrors.push(`PaymentRequest: ${errorMsg}`);
          console.error('❌ PaymentRequest method failed:', errorMsg);
        }
      } else {
        testErrors.push('PaymentRequest: method not available in Square SDK');
        console.warn('⚠️ payments.paymentRequest method not available');
      }
      
      // Method 2: Try legacy cashAppPay method if PaymentRequest failed
      if (!cashAppAvailable && typeof payments.cashAppPay === 'function') {
        try {
          console.log('🔄 Testing legacy cashAppPay method...');
          
          const cashAppPay = await payments.cashAppPay({
            redirectURL: window.location.origin,
            referenceId: `test-${Date.now()}`
          });
          
          if (cashAppPay) {
            cashAppAvailable = true;
            console.log('✅ Cash App Pay available via legacy method');
          } else {
            testErrors.push('cashAppPay: returned null/undefined');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          testErrors.push(`cashAppPay: ${errorMsg}`);
          console.error('❌ Legacy cashAppPay method failed:', errorMsg);
        }
      } else if (!cashAppAvailable) {
        testErrors.push('cashAppPay: method not available in Square SDK');
        console.warn('⚠️ payments.cashAppPay method not available');
      }
      
      setDiagnostics(prev => ({ 
        ...prev, 
        cashAppPayAvailable: cashAppAvailable,
        squareLoaded: true,
        cashAppPayError: cashAppAvailable ? undefined : testErrors.join('; ')
      }));
      
      if (cashAppAvailable) {
        console.log('✅ Cash App Pay is available and configured correctly!');
      } else {
        console.error('❌ All Cash App Pay initialization methods failed');
        console.log('🔍 Error summary:', testErrors);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDiagnostics(prev => ({ 
        ...prev, 
        cashAppPayError: errorMessage 
      }));
      console.error('❌ Overall test failed:', errorMessage);
    }
  };

  const loadSquareSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Square) {
        resolve();
        return;
      }

      const environment = diagnostics.environment;
      const scriptUrl = environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      console.log(`📦 Loading Square SDK from: ${scriptUrl}`);

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => {
        if (window.Square) {
          console.log('✅ Square SDK loaded successfully');
          resolve();
        } else {
          reject(new Error('Square SDK script loaded but window.Square not available'));
        }
      };
      script.onerror = () => reject(new Error(`Failed to load Square SDK from ${scriptUrl}`));
      document.head.appendChild(script);
    });
  };

  const getEnvironmentValidation = () => {
    const { environment, clientId } = diagnostics;
    
    if (environment === 'production' && !clientId.startsWith('sq0idp-')) {
      return {
        valid: false,
        message: 'Production environment requires production client ID (starts with sq0idp-)'
      };
    }
    
    if (environment === 'sandbox' && clientId.startsWith('sq0idp-')) {
      return {
        valid: false,
        message: 'Sandbox environment with production client ID detected'
      };
    }
    
    return {
      valid: true,
      message: 'Environment and client ID configuration appears correct'
    };
  };

  const envValidation = getEnvironmentValidation();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Cash App Pay Diagnostic Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Configuration Summary */}
        <div>
          <h3 className="font-medium mb-2">Current Configuration</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Environment:</span>
              <Badge variant={diagnostics.environment === 'production' ? 'default' : 'secondary'}>
                {diagnostics.environment}
              </Badge>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Client ID:</span>
              <span className="font-mono text-xs">
                {diagnostics.clientId ? diagnostics.clientId.substring(0, 15) + '...' : 'NOT SET'}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Validation */}
        <Alert variant={envValidation.valid ? 'default' : 'destructive'}>
          {envValidation.valid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription>{envValidation.message}</AlertDescription>
        </Alert>

        {/* Test Results */}
        {diagnostics.initializationAttempted && (
          <div>
            <h3 className="font-medium mb-2">Test Results</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Square SDK Loaded</span>
                <Badge variant={diagnostics.squareLoaded ? 'default' : 'destructive'}>
                  {diagnostics.squareLoaded ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Cash App Pay Available</span>
                <Badge variant={diagnostics.cashAppPayAvailable ? 'default' : 'destructive'}>
                  {diagnostics.cashAppPayAvailable ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {diagnostics.cashAppPayError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {diagnostics.cashAppPayError}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={testCashAppPayInitialization} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Test Cash App Pay Initialization
          </Button>
        </div>

        {/* Square Dashboard Instructions */}
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-medium mb-2">Square Dashboard Checklist</h3>
          <div className="text-sm space-y-1">
            <p><strong>1. Application Settings:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Go to Square Dashboard → Apps → My Apps</li>
              <li>Find application: <code className="bg-white px-1 rounded">{diagnostics.clientId}</code></li>
              <li>Verify you're in the <strong>Production</strong> environment tab</li>
            </ul>
            
            <p className="pt-2"><strong>2. Enable Cash App Pay:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Look for "Cash App Pay" in the features list</li>
              <li>If not enabled, click "Enable Cash App Pay"</li>
              <li>Complete any required setup steps</li>
            </ul>
            
            <p className="pt-2"><strong>3. Redirect URLs:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Add production redirect URL: <code className="bg-white px-1 rounded">https://your-domain.com</code></li>
              <li>Add webhook URL: <code className="bg-white px-1 rounded text-xs">https://aszzhlgwfbijaotfddsh.supabase.co/functions/v1/payments-webhook</code></li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}