import { useState } from 'react';
import { EmergencySquareCard } from '@/components/payment/EmergencySquareCard';
import { EmergencyCashApp } from '@/components/payment/EmergencyCashApp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function TestEmergencyPayment() {
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState('card');

  const handleSuccess = (data: any) => {
    console.log('Payment success:', data);
    setResult({
      type: 'success',
      message: `Payment successful! Token/Data: ${JSON.stringify(data).substring(0, 50)}...`
    });
  };

  const handleError = (error: string) => {
    console.error('Payment error:', error);
    setResult({
      type: 'error',
      message: error
    });
  };

  const testAmount = 10.00; // $10 test amount
  const testOrderId = `test-${Date.now()}`;
  const testEmail = 'test@example.com';

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Emergency Payment Components</CardTitle>
          <CardDescription>
            Testing the new emergency payment manager implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <Alert className={`mb-4 ${result.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
              {result.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card">Credit Card</TabsTrigger>
              <TabsTrigger value="cashapp">Cash App</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <EmergencySquareCard
                amount={testAmount}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </TabsContent>

            <TabsContent value="cashapp" className="mt-4">
              <EmergencyCashApp
                amount={testAmount}
                orderId={testOrderId}
                customerEmail={testEmail}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Test Details:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Amount: ${testAmount.toFixed(2)}</li>
              <li>Order ID: {testOrderId}</li>
              <li>Email: {testEmail}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}