import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { productionPaymentService } from '@/lib/payments/ProductionPaymentService';
import { OrderService } from '@/lib/services/OrderService';
import { TicketService } from '@/lib/services/TicketService';
import { EmailService } from '@/lib/services/EmailService';
import { seatingService } from '@/lib/services/SeatingService';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function PayPalCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const handlePayPalReturn = async () => {
      try {
        // Get PayPal parameters
        const token = searchParams.get('token'); // PayPal order ID
        const payerId = searchParams.get('PayerID');
        
        if (!token) {
          throw new Error('Invalid PayPal callback - missing order token');
        }

        // Get stored order data
        const pendingOrderData = sessionStorage.getItem('pendingPayPalOrder');
        if (!pendingOrderData) {
          throw new Error('Order data not found. Please try your purchase again.');
        }

        const orderData = JSON.parse(pendingOrderData);
        
        // User cancelled if no PayerID
        if (!payerId) {
          setStatus('error');
          setMessage('Payment cancelled. Redirecting back to checkout...');
          setTimeout(() => navigate(-1), 2000);
          return;
        }

        setMessage('Completing your PayPal payment...');

        // Capture the PayPal order
        const captureResult = await productionPaymentService.capturePayPalOrder(token, payerId);
        
        if (!captureResult.success) {
          throw new Error(captureResult.error || 'Failed to capture PayPal payment');
        }

        setMessage('Payment successful! Creating your order...');

        // Create order in database
        const order = await OrderService.createOrder({
          customer_email: orderData.customerEmail,
          customer_name: user?.user_metadata?.full_name || null,
          total_amount: orderData.amount,
          payment_intent_id: captureResult.data?.transactionId || null,
          payment_method: 'paypal',
          order_status: 'completed',
          payment_status: 'completed'
        }, orderData.seatCheckoutMode ? [] : orderData.items);

        setMessage('Generating your tickets...');

        // Generate tickets
        const tickets = await TicketService.generateTicketsForOrder(order.id);
        
        if (!tickets || tickets.length === 0) {
          throw new Error('Failed to generate tickets after payment');
        }

        // Send email notification
        try {
          const emailData = {
            customerName: order.customer_name || 'Valued Customer',
            customerEmail: orderData.customerEmail,
            eventTitle: tickets[0]?.ticket_types?.events?.title || 'Event',
            eventDate: tickets[0]?.ticket_types?.events?.date || new Date().toISOString(),
            eventTime: new Date(tickets[0]?.ticket_types?.events?.date || new Date()).toLocaleTimeString(),
            eventLocation: tickets[0]?.ticket_types?.events?.venue || tickets[0]?.ticket_types?.events?.location || 'TBD',
            tickets: tickets.map(ticket => ({
              id: ticket.id,
              ticketType: ticket.ticket_types?.name || 'General',
              qrCode: ticket.qr_code || '',
              holderName: ticket.holder_name || 'Ticket Holder'
            })),
            orderTotal: order.total_amount,
            orderId: order.id
          };
          await EmailService.sendTicketConfirmation(emailData);
        } catch (emailError) {
          console.error('Email failed but tickets created:', emailError);
        }

        // Handle seat checkout completion
        if (orderData.seatCheckoutMode && orderData.sessionId && orderData.eventId) {
          try {
            await seatingService.completeSeatPurchase(
              orderData.sessionId,
              orderData.eventId,
              order.id,
              orderData.customerEmail,
              order.customer_name || 'Ticket Holder',
              'paypal'
            );
            localStorage.removeItem('seatHoldSessionId');
          } catch (seatError) {
            console.error('Seat purchase completion failed:', seatError);
          }
        } else {
          // Clear cart for regular purchases
          clearCart();
        }

        // Clean up
        sessionStorage.removeItem('pendingPayPalOrder');

        setStatus('success');
        setMessage('Payment successful! Your tickets have been sent to your email.');
        toast.success('Payment successful! Check your email for tickets.');

        // Redirect to tickets page
        setTimeout(() => navigate('/dashboard/tickets'), 3000);

      } catch (error) {
        console.error('PayPal callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Payment processing failed');
        toast.error('Payment processing failed. Please try again.');
        
        // Redirect back after delay
        setTimeout(() => navigate(-1), 3000);
      }
    };

    handlePayPalReturn();
  }, [searchParams, navigate, clearCart, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-2xl font-semibold">Processing Payment</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400">Payment Successful!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to your tickets...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400">Payment Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back...</p>
          </>
        )}
      </div>
    </div>
  );
}