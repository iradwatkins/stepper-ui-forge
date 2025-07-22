import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ProductionCheckoutModal } from '@/components/payment/production/ProductionCheckoutModal';
import { ShoppingCart, AlertTriangle, CreditCard, Smartphone, AlertCircle, Check } from 'lucide-react';
import { PayPalLogo } from '@/components/payment/PaymentLogos';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useEffect } from 'react';
import { getPaymentConfig, validatePaymentConfig, debugPaymentConfig } from '@/config/production.payment.config';

export default function ProductionPaymentTest() {
  const { user } = useAuth();
  const { addItem, clearCart } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'cart' | 'seats'>('cart');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Get payment configuration and validation
  const paymentConfig = getPaymentConfig();
  const validation = validatePaymentConfig();

  // Mock cart items
  const mockCartItems = [
    {
      id: '1',
      title: 'General Admission',
      eventTitle: 'Summer Music Festival',
      eventDate: '2025-08-15',
      eventTime: '6:00 PM',
      eventLocation: 'Central Park',
      price: 5000, // $50.00 in cents
      quantity: 2
    }
  ];

  // Mock seat details
  const mockSeatDetails = [
    {
      id: 'seat-1',
      tableNumber: 'A1',
      seatNumber: '1',
      price: 10000, // $100.00
      category: 'VIP',
      categoryColor: '#FFD700'
    },
    {
      id: 'seat-2',
      tableNumber: 'A1', 
      seatNumber: '2',
      price: 10000, // $100.00
      category: 'VIP',
      categoryColor: '#FFD700'
    }
  ];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Production Payment System Test</h1>
        <p className="text-muted-foreground">
          Test the production-only payment system with real payment gateways
        </p>
      </div>

      {/* Production Warning */}
      <Alert className="mb-6 border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Production Mode Active</AlertTitle>
        <AlertDescription className="text-yellow-700">
          This page uses PRODUCTION payment credentials. Real payments will be processed.
          Only use test cards or accounts designated for testing.
        </AlertDescription>
      </Alert>

      {/* Authentication Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>You must be logged in to test payments</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <Badge variant="default" className="gap-1">
                Authenticated
              </Badge>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Not logged in</p>
              <Badge variant="destructive">
                Authentication Required
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Diagnostics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Environment Configuration</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setShowDiagnostics(!showDiagnostics);
                if (!showDiagnostics) {
                  debugPaymentConfig();
                }
              }}
            >
              {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
            </Button>
          </CardTitle>
          <CardDescription>
            Configuration source: {paymentConfig.configSource.square === 'environment' ? 'Environment Variables' : 'Hardcoded Fallback'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Configuration Valid</span>
              {validation.isValid ? (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive">Invalid</Badge>
              )}
            </div>
            
            {showDiagnostics && (
              <div className="space-y-3 mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Square Configuration</h4>
                  <div className="text-xs font-mono bg-muted p-3 rounded">
                    <div>App ID: {paymentConfig.square.appId.substring(0, 20)}...</div>
                    <div>Location: {paymentConfig.square.locationId}</div>
                    <div>Environment: {paymentConfig.square.environment}</div>
                    <div>Source: {paymentConfig.configSource.square}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">PayPal Configuration</h4>
                  <div className="text-xs font-mono bg-muted p-3 rounded">
                    <div>Client ID: {paymentConfig.paypal.clientId.substring(0, 20)}...</div>
                    <div>Environment: {paymentConfig.paypal.environment}</div>
                    <div>Source: {paymentConfig.configSource.paypal}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Environment Variables</h4>
                  <div className="text-xs font-mono bg-muted p-3 rounded">
                    <div>VITE_SQUARE_APP_ID: {import.meta.env.VITE_SQUARE_APP_ID || 'NOT SET'}</div>
                    <div>VITE_SQUARE_LOCATION_ID: {import.meta.env.VITE_SQUARE_LOCATION_ID || 'NOT SET'}</div>
                    <div>VITE_PAYPAL_CLIENT_ID: {import.meta.env.VITE_PAYPAL_CLIENT_ID || 'NOT SET'}</div>
                  </div>
                </div>
                
                {validation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Configuration Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Available Payment Methods</CardTitle>
          <CardDescription>All payment methods are configured for production</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <h4 className="font-semibold">Square Card</h4>
                <p className="text-sm text-muted-foreground">Credit/Debit Cards</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Smartphone className="h-8 w-8 text-green-600" />
              <div>
                <h4 className="font-semibold">Cash App</h4>
                <p className="text-sm text-muted-foreground">Mobile Payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <PayPalLogo className="h-6" />
              <div>
                <h4 className="font-semibold">PayPal</h4>
                <p className="text-sm text-muted-foreground">PayPal Account</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Test Checkout Scenarios</CardTitle>
          <CardDescription>Choose a scenario to test the checkout flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold">Cart-based Checkout</h3>
              <p className="text-sm text-muted-foreground">
                Test purchasing tickets from a shopping cart
              </p>
              <div className="text-sm">
                <p className="font-medium">Test items:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>2x General Admission @ $50.00 each = $100.00</li>
                </ul>
              </div>
              <Button 
                onClick={() => {
                  // Add mock items to cart
                  clearCart();
                  mockCartItems.forEach(item => {
                    addItem({
                      id: item.id,
                      title: item.title,
                      price: item.price,
                      quantity: item.quantity,
                      eventTitle: item.eventTitle,
                      eventDate: item.eventDate,
                      eventTime: item.eventTime,
                      eventLocation: item.eventLocation,
                      description: '',
                      maxPerPerson: 10
                    });
                  });
                  setCheckoutType('cart');
                  setIsCheckoutOpen(true);
                }}
                disabled={!user}
                className="w-full"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Test Cart Checkout
              </Button>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold">Seat-based Checkout</h3>
              <p className="text-sm text-muted-foreground">
                Test purchasing specific seats for an event
              </p>
              <div className="text-sm">
                <p className="font-medium">Test seats:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Table A1, Seats 1-2 (VIP) @ $100.00 each = $200.00</li>
                </ul>
              </div>
              <Button 
                onClick={() => {
                  setCheckoutType('seats');
                  setIsCheckoutOpen(true);
                }}
                disabled={!user}
                className="w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Test Seat Checkout
              </Button>
            </div>
          </div>

          {!user && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please log in to test the payment system
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Production Checkout Modal */}
      <ProductionCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        eventId="test-event-123"
        selectedSeats={checkoutType === 'seats' ? ['seat-1', 'seat-2'] : undefined}
        seatDetails={checkoutType === 'seats' ? mockSeatDetails : undefined}
      />
    </div>
  );
}