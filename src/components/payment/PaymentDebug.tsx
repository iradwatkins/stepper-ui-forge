// Payment Debug Component
// Simple component to debug payment service issues

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { paymentService } from '@/lib/payments/PaymentService';
import { getPaymentConfig } from '@/lib/payment-config';

export const PaymentDebug: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Get config without initializing
    try {
      const paymentConfig = getPaymentConfig();
      setConfig(paymentConfig);
    } catch (error) {
      console.error('Failed to get payment config:', error);
    }
  }, []);

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      setInitError(null);
      
      console.log('🔄 Starting payment service initialization...');
      
      await paymentService.initialize();
      
      const status = paymentService.getStatus();
      setServiceStatus(status);
      
      console.log('✅ Payment service initialized successfully:', status);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Payment service initialization failed:', error);
      setInitError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusIcon = (ready: boolean) => {
    return ready ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Payment Service Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Environment Configuration */}
          <div>
            <h4 className="font-medium mb-2">Environment Configuration</h4>
            {config ? (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>PayPal:</strong>
                    <div>Client ID: {config.paypal.clientId ? '✅ Set' : '❌ Missing'}</div>
                    <div>Environment: {config.paypal.environment}</div>
                  </div>
                  <div>
                    <strong>Square:</strong>
                    <div>App ID: {config.square.applicationId ? '✅ Set' : '❌ Missing'}</div>
                    <div>Access Token: {config.square.accessToken ? '✅ Set' : '❌ Missing'}</div>
                    <div>Location ID: {config.square.locationId ? '✅ Set' : '❌ Missing'}</div>
                    <div>Environment: {config.square.environment}</div>
                  </div>
                </div>
                <div>
                  <strong>Square Web SDK:</strong>
                  <span className="ml-2">
                    {typeof window !== 'undefined' && window.Square ? '✅ Loaded' : '❌ Not Loaded'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Loading configuration...</div>
            )}
          </div>

          {/* Service Status */}
          {serviceStatus && (
            <div>
              <h4 className="font-medium mb-2">Service Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Service Initialized:</span>
                  <Badge variant={serviceStatus.initialized ? 'default' : 'destructive'}>
                    {serviceStatus.initialized ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <span className="font-medium">Gateway Health:</span>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(serviceStatus.gatewayHealth.paypal)}
                      <span>PayPal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(serviceStatus.gatewayHealth.square)}
                      <span>Square</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(serviceStatus.gatewayHealth.cashapp)}
                      <span>Cash App</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Available Gateways:</span>
                  <Badge variant={serviceStatus.hasAvailableGateways ? 'default' : 'destructive'}>
                    {serviceStatus.hasAvailableGateways ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {initError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Initialization Error:</strong> {initError}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleInitialize}
              disabled={isInitializing}
              className="flex-1"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Initializing...
                </>
              ) : (
                'Initialize Payment Service'
              )}
            </Button>
            
            <Button 
              onClick={() => {
                console.clear();
                console.log('🧹 Console cleared');
              }}
              variant="outline"
            >
              Clear Console
            </Button>
          </div>

          {/* Available Methods */}
          {serviceStatus?.initialized && (
            <div>
              <h4 className="font-medium mb-2">Available Payment Methods</h4>
              {serviceStatus.hasAvailableGateways ? (
                <div className="text-sm text-green-600">
                  ✅ Payment methods are available. The modal should work.
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  ❌ No payment methods available. Check configuration and initialization errors.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};