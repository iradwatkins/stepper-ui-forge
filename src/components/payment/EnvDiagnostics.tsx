import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

export function EnvDiagnostics() {
  const envVars = {
    VITE_SQUARE_APP_ID: import.meta.env.VITE_SQUARE_APP_ID,
    VITE_SQUARE_LOCATION_ID: import.meta.env.VITE_SQUARE_LOCATION_ID,
    VITE_SQUARE_ENVIRONMENT: import.meta.env.VITE_SQUARE_ENVIRONMENT,
    VITE_CASHAPP_CLIENT_ID: import.meta.env.VITE_CASHAPP_CLIENT_ID,
    VITE_CASHAPP_ENVIRONMENT: import.meta.env.VITE_CASHAPP_ENVIRONMENT,
    VITE_PAYPAL_CLIENT_ID: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    VITE_PAYPAL_ENVIRONMENT: import.meta.env.VITE_PAYPAL_ENVIRONMENT,
  };

  const hasValue = (val: any) => val && val !== 'undefined' && val !== '';

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Environment Variables Diagnostic</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 border rounded">
              <span className="font-mono text-sm">{key}</span>
              <div className="flex items-center gap-2">
                {hasValue(value) ? (
                  <>
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Loaded
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {value?.substring(0, 10)}...
                    </span>
                  </>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <pre className="text-xs font-mono whitespace-pre-wrap">
{JSON.stringify({
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  baseUrl: import.meta.env.BASE_URL,
  windowSquare: typeof window !== 'undefined' && !!(window as any).Square,
}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}