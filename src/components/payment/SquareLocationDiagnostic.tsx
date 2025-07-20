import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertCircle, MapPin } from 'lucide-react';
import { getSquareLocationSettings } from '@/lib/payments/square-location-settings';

export function SquareLocationDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(import.meta.env.VITE_SQUARE_LOCATION_ID || '');
  const [accessToken, setAccessToken] = useState('');

  const testLocationSettings = async () => {
    if (!locationId || !accessToken) {
      setError('Please provide both Location ID and Access Token');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const settings = await getSquareLocationSettings(locationId, accessToken);
      setResults({
        success: true,
        settings,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch location settings';
      setError(errorMessage);
      setResults({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testWithProvidedCredentials = () => {
    // Using the credentials from the user's curl command
    setLocationId('L0Q2YC1SPBGD8');
    setAccessToken('EAAAlwLSKasNtDyFEQ4mDkK9Ces5pQ9FQ4_kiolkTnjd-4qHlOx2K9-VrGC7QcOi');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Square Location Settings Diagnostic
        </CardTitle>
        <CardDescription>
          Test Square Online Checkout location settings to see which payment methods are enabled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool checks which payment methods are enabled for a specific Square location.
            You need a valid Square access token and location ID.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="locationId">Location ID</Label>
            <Input
              id="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="e.g., L0Q2YC1SPBGD8"
            />
          </div>

          <div>
            <Label htmlFor="accessToken">Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Bearer token from Square Dashboard"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testLocationSettings}
              disabled={loading || !locationId || !accessToken}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Location Settings'
              )}
            </Button>

            <Button 
              onClick={testWithProvidedCredentials}
              variant="outline"
            >
              Use Test Credentials
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {results.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Location Settings Retrieved</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Request Failed</span>
                </>
              )}
            </div>

            {results.settings && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Enabled Payment Methods:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {results.settings.enabled_payment_methods?.cash_app_pay ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Cash App Pay</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results.settings.enabled_payment_methods?.apple_pay ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Apple Pay</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results.settings.enabled_payment_methods?.google_pay ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Google Pay</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results.settings.enabled_payment_methods?.afterpay_clearpay ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Afterpay/Clearpay</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Accepted Payment Methods:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {results.settings.accepted_payment_methods?.card !== false ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Credit/Debit Cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results.settings.accepted_payment_methods?.square_gift_card ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Square Gift Cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results.settings.accepted_payment_methods?.bank_account ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Bank Account</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results.settings.accepted_payment_methods?.buy_now_pay_later ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-gray-400" />
                      }
                      <span>Buy Now Pay Later</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 className="font-medium mb-2">Raw Response:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This API requires a valid Square OAuth access token</p>
          <p>• The location ID must be associated with your Square account</p>
          <p>• Cash App Pay must be enabled in your Square Dashboard</p>
        </div>
      </CardContent>
    </Card>
  );
}