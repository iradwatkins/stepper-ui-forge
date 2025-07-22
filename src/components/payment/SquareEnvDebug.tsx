import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSquareConfig } from '@/config/production.payment.config';

export function SquareEnvDebug() {
  useEffect(() => {
    console.group('🔍 Square Environment Debug Component');
    
    // Check raw environment variables
    console.log('Raw env vars:', {
      VITE_SQUARE_APP_ID: import.meta.env.VITE_SQUARE_APP_ID,
      VITE_SQUARE_LOCATION_ID: import.meta.env.VITE_SQUARE_LOCATION_ID,
      VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
      envType: typeof import.meta.env.VITE_SQUARE_APP_ID,
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE
    });
    
    // Check config result
    const config = getSquareConfig();
    console.log('Config result:', config);
    
    // Validate format
    if (config.appId) {
      const isProductionFormat = config.appId.startsWith('sq0idp-');
      const isSandboxFormat = config.appId.startsWith('sandbox-sq0idb-');
      console.log('Format validation:', {
        isProductionFormat,
        isSandboxFormat,
        isValidFormat: isProductionFormat || isSandboxFormat,
        appIdLength: config.appId.length,
        appIdSample: config.appId.substring(0, 20) + '...'
      });
    }
    
    console.groupEnd();
  }, []);

  const config = getSquareConfig();
  const envAppId = import.meta.env.VITE_SQUARE_APP_ID;
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Square Environment Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm font-mono">
          <div>
            <span className="text-muted-foreground">VITE_SQUARE_APP_ID:</span>
            <span className={envAppId ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
              {envAppId || 'NOT SET'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Config appId:</span>
            <span className="text-blue-600 ml-2">
              {config.appId?.substring(0, 20)}...
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Config source:</span>
            <span className="ml-2">
              {envAppId ? 'Environment Variable' : 'Production Fallback'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Environment:</span>
            <span className="ml-2">{config.environment}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Valid format:</span>
            <span className={
              config.appId && (config.appId.startsWith('sq0idp-') || config.appId.startsWith('sandbox-sq0idb-'))
                ? 'text-green-600 ml-2' 
                : 'text-red-600 ml-2'
            }>
              {config.appId && (config.appId.startsWith('sq0idp-') || config.appId.startsWith('sandbox-sq0idb-'))
                ? '✓ Valid' 
                : '✗ Invalid'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}