import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function SquareMethodsTest() {
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [paymentRequestResult, setPaymentRequestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadSquareSDK();
  }, []);

  const loadSquareSDK = async () => {
    if (window.Square) {
      checkAvailableMethods();
      return;
    }

    const environment = import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox';
    const scriptUrl = environment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';

    try {
      await loadScript(scriptUrl);
      if (window.Square) {
        setSquareLoaded(true);
        checkAvailableMethods();
      }
    } catch (error) {
      console.error('Failed to load Square SDK:', error);
    }
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  const checkAvailableMethods = () => {
    if (!window.Square) return;

    try {
      const payments = window.Square.payments(
        import.meta.env.VITE_SQUARE_APP_ID,
        import.meta.env.VITE_SQUARE_LOCATION_ID
      );

      const methods = Object.keys(payments);
      setAvailableMethods(methods);
      console.log('🔍 Available Square payment methods:', methods);
    } catch (error) {
      console.error('Failed to initialize Square payments:', error);
    }
  };

  const testPaymentRequest = async () => {
    if (!window.Square) {
      setPaymentRequestResult('Square SDK not loaded');
      return;
    }

    setTesting(true);
    setPaymentRequestResult('');

    try {
      const payments = window.Square.payments(
        import.meta.env.VITE_SQUARE_APP_ID,
        import.meta.env.VITE_SQUARE_LOCATION_ID
      );

      console.log('🧪 Testing PaymentRequest API...');

      if (typeof payments.paymentRequest !== 'function') {
        setPaymentRequestResult('❌ payments.paymentRequest method not available');
        setTesting(false);
        return;
      }

      const paymentRequest = payments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
          amount: '100', // $1.00
          label: 'Test Payment'
        },
        requestPayerName: false,
        requestPayerPhone: false,
        requestPayerEmail: false,
        requestShipping: false
      });

      if (!paymentRequest) {
        setPaymentRequestResult('❌ PaymentRequest creation failed');
        setTesting(false);
        return;
      }

      console.log('✅ PaymentRequest created successfully');
      console.log('🔍 PaymentRequest methods:', Object.keys(paymentRequest));

      if (typeof paymentRequest.canMakePayment === 'function') {
        const canMakePayment = await paymentRequest.canMakePayment();
        console.log('🧪 canMakePayment result:', canMakePayment);
        
        if (canMakePayment) {
          setPaymentRequestResult('✅ PaymentRequest API working - Cash App Pay should be available');
        } else {
          setPaymentRequestResult('⚠️ PaymentRequest created but canMakePayment returned false');
        }
      } else {
        setPaymentRequestResult('⚠️ PaymentRequest created but canMakePayment method missing');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setPaymentRequestResult(`❌ PaymentRequest test failed: ${errorMsg}`);
      console.error('PaymentRequest test failed:', error);
    }

    setTesting(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Square Payment Methods Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Square SDK Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span>Square SDK Loaded</span>
          <Badge variant={squareLoaded ? 'default' : 'destructive'}>
            {squareLoaded ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </Badge>
        </div>

        {/* Available Methods */}
        {availableMethods.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Available Payment Methods</h3>
            <div className="flex flex-wrap gap-2">
              {availableMethods.map((method) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* PaymentRequest Test */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">PaymentRequest API Test</h3>
            <Button 
              onClick={testPaymentRequest} 
              disabled={!squareLoaded || testing}
              size="sm"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test PaymentRequest'
              )}
            </Button>
          </div>
          
          {paymentRequestResult && (
            <div className="p-3 bg-gray-50 rounded text-sm">
              {paymentRequestResult}
            </div>
          )}
        </div>

        {/* Configuration Info */}
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>App ID:</strong> {import.meta.env.VITE_SQUARE_APP_ID?.substring(0, 15)}...</p>
          <p><strong>Environment:</strong> {import.meta.env.VITE_SQUARE_ENVIRONMENT}</p>
          <p><strong>Location ID:</strong> {import.meta.env.VITE_SQUARE_LOCATION_ID}</p>
        </div>
      </CardContent>
    </Card>
  );
}