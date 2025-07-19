import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function SquareDebugComponent() {
  const [envVars, setEnvVars] = useState<any>({});
  const [sdkStatus, setSdkStatus] = useState<{
    squareLoaded: boolean;
    cashAppLoaded: boolean;
    error?: string;
  }>({ squareLoaded: false, cashAppLoaded: false });

  useEffect(() => {
    // Capture all environment variables
    const vars = {
      VITE_SQUARE_APP_ID: import.meta.env.VITE_SQUARE_APP_ID,
      VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
      VITE_SQUARE_LOCATION_ID: import.meta.env.VITE_SQUARE_LOCATION_ID,
      VITE_CASHAPP_CLIENT_ID: import.meta.env.VITE_CASHAPP_CLIENT_ID,
      VITE_CASHAPP_ENVIRONMENT: import.meta.env.VITE_CASHAPP_ENVIRONMENT,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD
    };
    setEnvVars(vars);

    // Check SDK loading status
    checkSDKStatus();
  }, []);

  const checkSDKStatus = () => {
    const squareLoaded = typeof window !== 'undefined' && !!window.Square;
    const cashAppLoaded = typeof window !== 'undefined' && !!window.CashAppPay;
    
    setSdkStatus({
      squareLoaded,
      cashAppLoaded
    });
  };

  const testSquareSDKLoad = async () => {
    try {
      const environment = envVars.VITE_SQUARE_ENVIRONMENT || 'sandbox';
      const scriptUrl = environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

      console.log('🔄 Testing Square SDK load from:', scriptUrl);
      
      if (!window.Square) {
        await loadScript(scriptUrl);
      }
      
      if (window.Square) {
        console.log('✅ Square SDK loaded successfully');
        setSdkStatus(prev => ({ ...prev, squareLoaded: true }));
      } else {
        throw new Error('Square SDK loaded but window.Square not available');
      }
    } catch (error) {
      console.error('❌ Square SDK load failed:', error);
      setSdkStatus(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
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

  const validateEnvironment = () => {
    const issues = [];
    
    // Check Square environment vs client ID format
    const squareAppId = envVars.VITE_SQUARE_APP_ID;
    const squareEnv = envVars.VITE_SQUARE_ENVIRONMENT;
    
    if (squareEnv === 'production' && (!squareAppId || !squareAppId.startsWith('sq0idp-'))) {
      issues.push('Square: Production environment but Application ID format suggests sandbox');
    }
    
    if (squareEnv === 'sandbox' && squareAppId && squareAppId.startsWith('sq0idp-')) {
      issues.push('Square: Sandbox environment but Application ID format suggests production');
    }
    
    // Check Cash App environment vs client ID format
    const cashAppId = envVars.VITE_CASHAPP_CLIENT_ID;
    const cashAppEnv = envVars.VITE_CASHAPP_ENVIRONMENT;
    
    if (cashAppEnv === 'production' && (!cashAppId || !cashAppId.startsWith('sq0idp-'))) {
      issues.push('Cash App: Production environment but Client ID format suggests sandbox');
    }
    
    if (cashAppEnv === 'sandbox' && cashAppId && cashAppId.startsWith('sq0idp-')) {
      issues.push('Cash App: Sandbox environment but Client ID format suggests production');
    }
    
    // Check if Cash App Client ID matches Square App ID
    if (squareAppId && cashAppId && squareAppId !== cashAppId) {
      issues.push('Warning: Cash App Client ID differs from Square Application ID');
    }
    
    return issues;
  };

  const envIssues = validateEnvironment();

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Square Payment Configuration Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Environment Variables */}
          <div>
            <h3 className="font-medium mb-2">Environment Variables</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="font-mono text-xs">{key}:</span>
                  <span className="font-mono text-xs truncate ml-2">
                    {value ? (typeof value === 'string' && value.length > 20 ? value.substring(0, 20) + '...' : String(value)) : '❌ NOT SET'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Environment Validation */}
          <div>
            <h3 className="font-medium mb-2">Environment Validation</h3>
            {envIssues.length > 0 ? (
              <div className="space-y-2">
                {envIssues.map((issue, index) => (
                  <Alert key={index} variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{issue}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>All environment configurations appear valid</AlertDescription>
              </Alert>
            )}
          </div>

          {/* SDK Status */}
          <div>
            <h3 className="font-medium mb-2">SDK Loading Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Square SDK (window.Square)</span>
                <Badge variant={sdkStatus.squareLoaded ? 'default' : 'destructive'}>
                  {sdkStatus.squareLoaded ? 'Loaded' : 'Not Loaded'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>Cash App SDK (window.CashAppPay)</span>
                <Badge variant={sdkStatus.cashAppLoaded ? 'default' : 'secondary'}>
                  {sdkStatus.cashAppLoaded ? 'Loaded' : 'Not Loaded'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {sdkStatus.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{sdkStatus.error}</AlertDescription>
            </Alert>
          )}

          {/* Test Button */}
          <div>
            <Button onClick={testSquareSDKLoad} className="w-full">
              Test Square SDK Loading
            </Button>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="font-medium mb-2">Square Dashboard Checklist</h3>
            <div className="text-sm space-y-2 bg-blue-50 p-3 rounded">
              <p className="font-medium">Please verify in your Square Dashboard:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Application ID: <code className="bg-white px-1 rounded">{envVars.VITE_SQUARE_APP_ID}</code></li>
                <li>Environment: <code className="bg-white px-1 rounded">{envVars.VITE_SQUARE_ENVIRONMENT}</code></li>
                <li>Cash App Pay is enabled for this application</li>
                <li>Cash App Pay Client ID matches your configuration</li>
                <li>Location ID: <code className="bg-white px-1 rounded">{envVars.VITE_SQUARE_LOCATION_ID}</code> exists</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}