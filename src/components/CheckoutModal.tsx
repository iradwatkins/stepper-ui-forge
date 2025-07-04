import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CreditCard, Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { productionPaymentService } from "@/lib/payments/ProductionPaymentService";
import { OrderService } from "@/lib/services/OrderService";
import { TicketService } from "@/lib/services/TicketService";
import { EmailService } from "@/lib/services/EmailService";
import { toast } from "sonner";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, total, subtotal, fees, clearCart } = useCart();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>('paypal');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; available: boolean }[]>([]);

  useEffect(() => {
    if (isOpen) {
      const methods = productionPaymentService.getAvailablePaymentMethods();
      setPaymentMethods(methods);
      setSelectedGateway(methods[0]?.id || 'paypal');
      setCustomerEmail(user?.email || '');
    }
  }, [isOpen, user]);

  const handleCheckout = async () => {
    if (items.length === 0) {
      setError("Your cart is empty");
      return;
    }

    if (!customerEmail) {
      setError("Please enter your email address");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const orderId = `order_${Date.now()}_${user?.id || 'guest'}`;
      
      const paymentData = {
        amount: total,
        gateway: selectedGateway,
        orderId,
        customerEmail,
        items: items.map(item => ({
          ticketTypeId: item.ticketTypeId,
          eventId: item.eventId,
          quantity: item.quantity,
          price: item.price,
          title: item.title,
          eventTitle: item.eventTitle
        }))
      };

      console.log('Processing payment:', paymentData);

      const result = await productionPaymentService.processPayment(paymentData);

      if (result.success) {
        try {
          // Create order after successful payment
          console.log('Creating order for payment:', result);
          const order = await OrderService.createOrder({
            customer_email: customerEmail,
            customer_name: user?.user_metadata?.full_name || null,
            total_amount: total,
            payment_intent_id: result.transactionId || null,
            payment_method: selectedGateway,
            order_status: 'completed',
            payment_status: 'completed'
          }, items);

          console.log('Order created:', order);

          // Generate tickets for the order
          const tickets = await TicketService.generateTicketsForOrder(order.id);
          console.log('Tickets generated:', tickets);

          if (!tickets || tickets.length === 0) {
            throw new Error('Failed to generate tickets after payment');
          }

          // Send email notification
          try {
            const emailData = {
              customerName: order.customer_name || 'Valued Customer',
              customerEmail: customerEmail,
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
            console.log('Email sent successfully');
            
            toast.success("Payment successful! Your tickets have been purchased and sent to your email.");
          } catch (emailError) {
            console.error('Email failed but tickets created:', emailError);
            toast.success("Payment successful! Your tickets have been purchased. Check your My Tickets page to view them.");
          }

          clearCart();
          onClose();
        } catch (orderError) {
          console.error('Order/ticket creation failed after payment:', orderError);
          
          // Payment succeeded but order/ticket creation failed
          // This is a critical error that needs manual intervention
          toast.error("Payment processed but ticket creation failed. Please contact support with your payment confirmation.");
          
          // Don't clear cart or close modal so user can retry or contact support
          throw new Error('Ticket generation failed after payment. Please contact support.');
        }
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Checkout
          </DialogTitle>
          <DialogDescription>
            Review your tickets and complete your purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cart Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
              <CardDescription>{items.length} item{items.length !== 1 ? 's' : ''} in your cart</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.eventTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.eventDate} at {item.eventTime}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1">
                        Qty: {item.quantity}
                      </Badge>
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}

              {items.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Processing Fee:</span>
                      <span>${fees.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {items.length > 0 && (
            <>
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedGateway === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedGateway(method.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{method.name}</h4>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedGateway === method.id
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            {items.length > 0 && (
              <Button onClick={handleCheckout} disabled={isProcessing || !customerEmail}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Complete Purchase - $${total.toFixed(2)}`
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}