// ==========================================
// PAYPAL - PRODUCTION ONLY
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { PayPalLogo } from '@/components/payment/PaymentLogos';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalPaymentProps {
  amount: number; // Amount in cents
  orderId: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export const PayPalPayment: React.FC<PayPalPaymentProps> = ({
  amount,
  orderId,
  onSuccess,
  onError
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadPayPalScript = () => {
      if (window.paypal) {
        renderPayPalButtons();
        return;
      }

      // Check if script is already loading
      const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
      if (existingScript) {
        existingScript.addEventListener('load', renderPayPalButtons);
        existingScript.addEventListener('error', () => {
          setError('Failed to load PayPal');
          onError('Failed to load PayPal');
        });
        return;
      }

      const script = document.createElement('script');
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      
      if (!clientId) {
        setError('PayPal not configured');
        onError('PayPal not configured');
        return;
      }

      // PRODUCTION PayPal SDK
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.async = true;
      script.defer = true;
      
      script.addEventListener('load', () => {
        console.log('[PayPal] SDK loaded successfully');
        renderPayPalButtons();
      });
      
      script.addEventListener('error', () => {
        setError('Failed to load PayPal');
        onError('Failed to load PayPal');
      });
      
      document.body.appendChild(script);
    };

    const renderPayPalButtons = () => {
      if (!paypalRef.current || !window.paypal) return;

      try {
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
          },
          createOrder: (data: any, actions: any) => {
            console.log('[PayPal] Creating production order...');
            return actions.order.create({
              intent: 'CAPTURE', // Production intent
              purchase_units: [{
                reference_id: orderId,
                amount: {
                  value: (amount / 100).toFixed(2),
                  currency_code: 'USD'
                },
                description: `Order ${orderId}` // Production description
              }]
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              console.log('[PayPal] Capturing payment...');
              const details = await actions.order.capture();
              
              console.log('[PayPal] Payment captured:', details);
              
              // Process with production backend
              const response = await fetch('/rest/v1/rpc/process_paypal_payment', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
                },
                body: JSON.stringify({
                  p_order_id: orderId,
                  p_paypal_order_id: details.id,
                  p_amount: amount,
                  p_status: details.status,
                  p_payer_email: details.payer?.email_address || null
                })
              });

              const result = await response.json();
              
              if (result && !result.error) {
                console.log('[PayPal] Production payment successful:', details.id);
                onSuccess(details.id);
              } else {
                throw new Error(result.error || 'Payment processing failed');
              }
            } catch (error: any) {
              console.error('[PayPal] Payment error:', error);
              setError(error.message || 'Payment failed');
              onError(error.message || 'Payment failed');
            }
          },
          onError: (err: any) => {
            console.error('[PayPal] Error:', err);
            setError('PayPal payment failed');
            onError('PayPal payment failed');
          },
          onCancel: () => {
            console.log('[PayPal] Payment cancelled');
          }
        }).render(paypalRef.current);

        setIsLoading(false);
        setError(null);
        console.log('[PayPal] Buttons rendered successfully');
      } catch (err: any) {
        console.error('[PayPal] Render error:', err);
        setError('Failed to initialize PayPal');
        onError('Failed to initialize PayPal');
      }
    };

    loadPayPalScript();
  }, [amount, orderId, onSuccess, onError]);

  return (
    <div className="paypal-payment space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <PayPalLogo className="h-5" />
        <h3 className="text-lg font-semibold">Pay with PayPal</h3>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading PayPal...</span>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div ref={paypalRef} id="paypal-button-container" />
    </div>
  );
};