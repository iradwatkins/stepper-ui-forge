import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SQUARE_PRODUCTION_CONFIG, validateSquareConfig } from '@/lib/square/squareConfig';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function SquareDiagnostic() {
  const [results, setResults] = useState<any>({});

  const runDiagnostic = () => {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      config: SQUARE_PRODUCTION_CONFIG,
      validation: {},
      environment: {},
      issues: []
    };

    // Check config validation
    try {
      validateSquareConfig();
      diagnostics.validation.configValid = true;
      diagnostics.validation.message = 'Hardcoded config is valid';
    } catch (err: any) {
      diagnostics.validation.configValid = false;
      diagnostics.validation.error = err.message;
    }

    // Check environment variables (these are likely the problem)
    diagnostics.environment = {
      VITE_SQUARE_APP_ID: {
        value: import.meta.env?.VITE_SQUARE_APP_ID || 'UNDEFINED',
        type: typeof import.meta.env?.VITE_SQUARE_APP_ID,
        raw: import.meta.env?.VITE_SQUARE_APP_ID
      },
      VITE_SQUARE_LOCATION_ID: {
        value: import.meta.env?.VITE_SQUARE_LOCATION_ID || 'UNDEFINED',
        type: typeof import.meta.env?.VITE_SQUARE_LOCATION_ID,
        raw: import.meta.env?.VITE_SQUARE_LOCATION_ID
      },
      VITE_SQUARE_ENVIRONMENT: {
        value: import.meta.env?.VITE_SQUARE_ENVIRONMENT || 'UNDEFINED',
        type: typeof import.meta.env?.VITE_SQUARE_ENVIRONMENT,
        raw: import.meta.env?.VITE_SQUARE_ENVIRONMENT
      }
    };

    // Check for common issues
    Object.entries(diagnostics.environment).forEach(([key, data]: [string, any]) => {
      if (data.value === 'false' || data.raw === false) {
        diagnostics.issues.push({
          severity: 'critical',
          message: `${key} is set to "false" - this will break Square`
        });
      }
      if (data.value === 'undefined' || data.raw === undefined) {
        diagnostics.issues.push({
          severity: 'warning',
          message: `${key} is undefined`
        });
      }
      if (data.type === 'string' && data.value.includes('sandbox')) {
        diagnostics.issues.push({
          severity: 'critical',
          message: `${key} contains sandbox ID in production`
        });
      }
      if (data.type === 'boolean') {
        diagnostics.issues.push({
          severity: 'critical',
          message: `${key} is a boolean (${data.raw}) instead of string`
        });
      }
    });

    // Check Square SDK
    diagnostics.sdk = {
      loaded: !!window.Square,
      version: window.Square?.version || 'N/A',
      payments: typeof window.Square?.payments === 'function'
    };

    // Test initialization with hardcoded values
    diagnostics.hardcodedTest = {
      appId: SQUARE_PRODUCTION_CONFIG.applicationId,
      locationId: SQUARE_PRODUCTION_CONFIG.locationId,
      validFormat: SQUARE_PRODUCTION_CONFIG.applicationId.startsWith('sq0idp-'),
      length: SQUARE_PRODUCTION_CONFIG.applicationId.length
    };

    setResults(diagnostics);
    console.log('Square Diagnostic Results:', diagnostics);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Square Configuration Diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} className="w-full">
          Run Diagnostic
        </Button>
        
        {Object.keys(results).length > 0 && (
          <>
            {/* Summary */}
            {results.issues && results.issues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Critical Issues Found:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {results.issues.map((issue: any, idx: number) => (
                      <li key={idx} className="text-sm">
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Hardcoded Config Status */}
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-800">Emergency Fix Status:</p>
                <p className="text-sm text-green-700 mt-1">
                  Using hardcoded production credentials: {SQUARE_PRODUCTION_CONFIG.applicationId.substring(0, 15)}...
                </p>
              </AlertDescription>
            </Alert>

            {/* Detailed Results */}
            <div className="bg-gray-100 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Full Diagnostic Results:</h4>
              <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}