import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CheckoutModal } from '@/components/CheckoutModal';

export default function PaymentTestPage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: any = {};

    // Test 1: Check if user is authenticated
    results.auth = {
      passed: !!user,
      message: user ? `Authenticated as ${user.email}` : 'Not authenticated'
    };

    // Test 2: Check Square edge function health
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments-square?health=true`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();
      results.squareHealth = {
        passed: response.ok && data.status === 'healthy',
        message: data.configured ? 'Square is configured and healthy' : 'Square not configured',
        details: data
      };
    } catch (error) {
      results.squareHealth = {
        passed: false,
        message: `Health check failed: ${error}`,
        error
      };
    }

    // Test 3: Check database schema
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Try to query orders table with required columns
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_status, payment_status, total_amount, customer_email')
        .limit(1);
      
      results.database = {
        passed: !error,
        message: error ? `Database error: ${error.message}` : 'Database schema is correct',
        error
      };
    } catch (error) {
      results.database = {
        passed: false,
        message: `Database check failed: ${error}`,
        error
      };
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const addTestItem = () => {
    addItem({
      id: 'test-item-1',
      ticketTypeId: 'test-ticket-1',
      eventId: 'test-event-1',
      eventTitle: 'Test Event',
      title: 'Test Ticket',
      description: 'General Admission',
      price: 10.00,
      quantity: 1,
      eventDate: '2025-12-31',
      eventTime: '8:00 PM',
      eventLocation: 'Test Venue'
    });
    setShowCheckout(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment System Test</CardTitle>
          <CardDescription>
            Run diagnostics on the payment system to ensure everything is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runTests} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Diagnostics'
              )}
            </Button>
            
            <Button 
              onClick={addTestItem}
              variant="outline"
              className="flex-1"
              disabled={!user}
            >
              Test Checkout Flow
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="font-semibold text-lg">Test Results:</h3>
              
              {Object.entries(testResults).map(([key, result]: [string, any]) => (
                <Alert key={key} variant={result.passed ? 'default' : 'destructive'}>
                  <div className="flex items-start gap-2">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <AlertDescription>{result.message}</AlertDescription>
                      {result.details && (
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {!user && (
            <Alert>
              <AlertDescription>
                Please sign in to test the full checkout flow
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Fix Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">If "order_status column not found" error:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to <a href="https://supabase.com/dashboard/project/aszzhlgwfbijaotfddsh/sql/new" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase SQL Editor</a></li>
              <li>Copy and run the contents of <code className="bg-gray-100 px-1">FIX_DATABASE_NOW.sql</code></li>
              <li>Wait 10 seconds for schema to refresh</li>
              <li>Test checkout again</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Current Status:</h4>
            <ul className="space-y-1 text-sm">
              <li>✅ Square payment processing fixed</li>
              <li>✅ Edge function handles health checks</li>
              <li>✅ Frontend order creation fixed</li>
              <li>⚠️ Database schema needs manual update (run SQL above)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <CheckoutModal 
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </div>
  );
}