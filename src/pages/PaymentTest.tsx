// Payment Test Page
// Development page for testing payment gateway integrations

import React from 'react';
import { PaymentTest } from '@/components/payment/PaymentTest';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

const PaymentTestPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-h-screen overflow-y-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Payment Gateway Test</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Testing interface for PayPal, Square, and Cash App integrations
        </p>
        
        {/* Modal Version Demo */}
        <div className="mt-4">
          <PaymentModal 
            trigger={
              <Button variant="outline" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Open Payment Modal
              </Button>
            }
            onPaymentSuccess={(result) => {
              console.log('Payment successful:', result);
            }}
            onPaymentError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        </div>
      </div>
      
      <PaymentTest />
    </div>
  );
};

export default PaymentTestPage;