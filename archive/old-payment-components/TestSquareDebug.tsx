import React, { useEffect, useState } from 'react';
import { getSquareConfig } from '@/config/production.payment.config';
import { initializeSquareWithFallback } from '@/lib/payments/square-init-fix';

export function TestSquareDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [initResult, setInitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get configuration
    const config = getSquareConfig();
    
    // Collect debug information
    const info = {
      config: {
        appId: config.appId,
        appIdType: typeof config.appId,
        appIdLength: config.appId?.length,
        appIdPrefix: config.appId?.substring(0, 10),
        locationId: config.locationId,
        environment: config.environment,
      },
      envVars: {
        VITE_SQUARE_APP_ID: import.meta.env.VITE_SQUARE_APP_ID,
        VITE_SQUARE_APP_ID_type: typeof import.meta.env.VITE_SQUARE_APP_ID,
        VITE_SQUARE_LOCATION_ID: import.meta.env.VITE_SQUARE_LOCATION_ID,
        VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
        hasImportMetaEnv: !!import.meta.env,
        envKeys: Object.keys(import.meta.env || {}),
      },
      validation: {
        isValidFormat: config.appId?.startsWith('sq0idp-') || config.appId?.startsWith('sandbox-sq0idb-'),
        isUndefinedString: config.appId === 'undefined',
        isNull: config.appId === null,
        isUndefined: config.appId === undefined,
        isFalsy: !config.appId,
      }
    };
    
    setDebugInfo(info);
    
    // Test initialization
    initializeSquareWithFallback()
      .then(result => {
        setInitResult({
          success: true,
          config: result.config,
          hasPayments: !!result.payments,
        });
      })
      .catch(err => {
        setError(err.message);
        setInitResult({
          success: false,
          error: err.message,
        });
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Square Configuration Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Configuration Result</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(debugInfo.config, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(debugInfo.envVars, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Validation Checks</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(debugInfo.validation, null, 2)}</pre>
        </div>
        
        <div className={`p-4 rounded ${initResult?.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h2 className="font-semibold mb-2">Initialization Test</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(initResult, null, 2)}</pre>
          {error && <p className="text-red-600 mt-2">Error: {error}</p>}
        </div>
        
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Expected Values</h2>
          <pre className="text-sm">
appId: sq0idp-XG8irNWHf98C62-iqOwH6Q
locationId: L0Q2YC1SPBGD8
environment: production
          </pre>
        </div>
      </div>
    </div>
  );
}