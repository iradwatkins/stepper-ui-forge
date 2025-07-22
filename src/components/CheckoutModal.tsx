import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, CreditCard, Loader2, ShoppingCart, Check, Shield, Zap, Clock } from "lucide-react";
import { PayPalLogo, CashAppLogo, CreditCardIcon, VisaLogo, MastercardLogo, AmexLogo } from "@/components/payment/PaymentLogos";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { productionPaymentService } from "@/lib/payments/ProductionPaymentService";
import { OrderService } from "@/lib/services/OrderService";
import { TicketService } from "@/lib/services/TicketService";
import { EmailService } from "@/lib/services/EmailService";
import { seatingService } from "@/lib/services/SeatingService";
import { CheckoutAuthGuard } from "@/components/auth/CheckoutAuthGuard";
import { SquarePaymentSimple } from "@/components/payments/SquarePaymentSimple";
import { CashAppPay } from "@/components/payment/CashAppPay";
import { toast } from "sonner";

interface SeatDetails {
  id: string;
  seatNumber: string;
  section?: string;
  row?: string;
  price: number;
  category: string;
  categoryColor: string;
  isPremium?: boolean;
  tableType?: 'round' | 'square';
  tableCapacity?: number;
  amenities?: string[];
  isADA?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  selectedSeats?: string[]; // For seat-based checkout
  seatDetails?: SeatDetails[]; // Detailed seat information
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
}

export function CheckoutModal({ isOpen, onClose, eventId, selectedSeats, seatDetails, eventTitle, eventDate, eventTime, eventLocation }: CheckoutModalProps) {
  const { items, total, subtotal, fees, clearCart } = useCart();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>('square');
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; available: boolean }[]>([]);
  const [seatCheckoutMode, setSeatCheckoutMode] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seatSubtotal, setSeatSubtotal] = useState(0);
  const [seatTotal, setSeatTotal] = useState(0);
  const [squarePaymentToken, setSquarePaymentToken] = useState<string | null>(null);
  const [squarePaymentMethod, setSquarePaymentMethod] = useState<'card' | 'cashapp' | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load payment methods asynchronously
      const loadPaymentMethods = async () => {
        try {
          const methods = await productionPaymentService.getAvailablePaymentMethods();
          console.log('💳 Loaded payment methods:', methods);
          
          // Reorder payment methods: Square (Credit Card), Cash App, PayPal
          const orderedMethods = [];
          const squareMethod = methods.find(m => m.id === 'square');
          const cashappMethod = methods.find(m => m.id === 'cashapp');
          const paypalMethod = methods.find(m => m.id === 'paypal');
          
          if (squareMethod) orderedMethods.push(squareMethod);
          if (cashappMethod) orderedMethods.push(cashappMethod);
          if (paypalMethod) orderedMethods.push(paypalMethod);
          
          // Add any other methods that might exist
          methods.forEach(method => {
            if (!orderedMethods.find(m => m.id === method.id)) {
              orderedMethods.push(method);
            }
          });
          
          setPaymentMethods(orderedMethods);
          setSelectedGateway(orderedMethods[0]?.id || 'square');
        } catch (error) {
          console.error('Failed to load payment methods:', error);
          // Fallback to empty array if loading fails
          setPaymentMethods([]);
        }
      };
      
      loadPaymentMethods();
      
      // Determine checkout mode
      const isSeatingCheckout = selectedSeats && selectedSeats.length > 0 && eventId;
      setSeatCheckoutMode(!!isSeatingCheckout);
      
      // Calculate seat pricing
      if (isSeatingCheckout && seatDetails) {
        const subtotal = seatDetails.reduce((sum, seat) => sum + seat.price, 0);
        const processingFee = Math.max(subtotal * 0.03, 1.50); // 3% with minimum $1.50
        const serviceFee = seatDetails.length * 2; // $2 per seat
        
        setSeatSubtotal(subtotal);
        setSeatTotal(subtotal + processingFee + serviceFee);
      }
      
      // Get session ID for seat checkout
      if (isSeatingCheckout) {
        const storedSessionId = localStorage.getItem('seatHoldSessionId');
        setSessionId(storedSessionId);
      }
    }
  }, [isOpen, user, selectedSeats, eventId, seatDetails]);

  const handleCheckout = async () => {
    // Check if we have items to purchase (cart or seats)
    const hasCartItems = items.length > 0;
    const hasSeatItems = seatCheckoutMode && selectedSeats && selectedSeats.length > 0;
    
    if (!hasCartItems && !hasSeatItems) {
      setError("No items to purchase");
      return;
    }
    
    // For seat checkout, validate session
    if (seatCheckoutMode && (!sessionId || !eventId)) {
      setError("Invalid seat reservation. Please select seats again.");
      return;
    }

    if (!user?.email) {
      setError("Please sign in to complete your purchase");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // For Square payments, ensure we have a payment token
      if (selectedGateway === 'square' && !squarePaymentToken) {
        setError("Please complete the payment form first");
        setIsProcessing(false);
        return;
      }
      
      const orderId = `order_${Date.now()}_${user?.id || 'guest'}`;
      
      const paymentData = {
        amount: Math.round((seatCheckoutMode ? seatTotal : total) * 100), // Convert to cents
        gateway: selectedGateway,
        orderId,
        customerEmail: user?.email || '',
        // Add Square payment token for Square payments
        ...(selectedGateway === 'square' && squarePaymentToken && {
          sourceId: squarePaymentToken
        }),
        items: seatCheckoutMode ? seatDetails?.map(seat => ({
          seatId: seat.id,
          seatNumber: seat.seatNumber,
          section: seat.section,
          row: seat.row,
          price: seat.price,
          category: seat.category,
          eventId: eventId!,
          eventTitle: eventTitle || 'Event',
          isPremium: seat.isPremium,
          tableType: seat.tableType,
          amenities: seat.amenities
        })) || [] : items.map(item => ({
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
        // Handle PayPal order approval flow
        if (result.requiresAction && result.action === 'approve_paypal_order') {
          console.log('PayPal order created, redirecting for approval:', result.data);
          
          // Store order data for after approval
          sessionStorage.setItem('pendingPayPalOrder', JSON.stringify({
            paypalOrderId: result.data.paypalOrderId,
            orderId: orderId,
            customerEmail: user?.email || '',
            amount: Math.round((seatCheckoutMode ? seatTotal : total) * 100), // Store in cents
            seatCheckoutMode,
            items: seatCheckoutMode ? seatDetails : items,
            sessionId,
            eventId
          }));
          
          // Redirect to PayPal for approval
          if (result.data.approvalUrl) {
            window.location.href = result.data.approvalUrl;
          } else {
            throw new Error('PayPal approval URL not provided');
          }
          return;
        }
        
        // Handle Cash App redirect flow
        if (result.requiresAction && result.action === 'redirect_cashapp') {
          console.log('Cash App payment initiated, redirecting:', result.data);
          
          // Store order data for after redirect
          sessionStorage.setItem('pendingCashAppOrder', JSON.stringify({
            paymentId: result.data.paymentId,
            orderId: orderId,
            customerEmail: user?.email || '',
            amount: Math.round((seatCheckoutMode ? seatTotal : total) * 100), // Store in cents
            seatCheckoutMode,
            items: seatCheckoutMode ? seatDetails : items,
            sessionId,
            eventId
          }));
          
          // Redirect to Cash App
          if (result.data.redirectUrl) {
            window.location.href = result.data.redirectUrl;
          } else {
            throw new Error('Cash App redirect URL not provided');
          }
          return;
        }
        
        try {
          // Create order after successful payment
          console.log('Creating order for payment:', result);
          
          // Format data according to OrderService expectations
          const orderRequest = {
            customer: {
              email: user?.email || '',
              name: user?.user_metadata?.full_name || undefined,
              phone: undefined
            },
            payment: {
              paymentIntentId: result.data?.transactionId || result.data?.paymentId || undefined,
              paymentMethod: selectedGateway,
              totalAmount: seatCheckoutMode ? seatTotal : total,
              status: 'completed' as const
            },
            cartItems: seatCheckoutMode && seatDetails ? 
              // Convert seat details to cart items format
              seatDetails.map(seat => ({
                id: `seat-${seat.id}`,
                ticketTypeId: seat.id, // Using seat ID as ticket type
                eventId: eventId!,
                eventTitle: eventTitle || 'Event',
                title: `Seat ${seat.seatNumber}`,
                description: seat.category,
                price: seat.price,
                quantity: 1,
                eventDate: eventDate || '',
                eventTime: eventTime || '',
                eventLocation: eventLocation || '',
                maxPerPerson: 1
              })) : 
              items
          };

          const orderResult = await OrderService.createOrder(orderRequest);

          if (!orderResult.success) {
            throw new Error(orderResult.error || 'Failed to create order');
          }

          console.log('Order created:', orderResult.order);

          // Generate tickets for the order
          const tickets = await TicketService.generateTicketsForOrder(orderResult.order.id);
          console.log('Tickets generated:', tickets);

          if (!tickets || tickets.length === 0) {
            throw new Error('Failed to generate tickets after payment');
          }

          // Send email notification
          try {
            // @ts-ignore - Email data structure
            const emailData = {
              customerName: orderResult.order.customer_name || 'Valued Customer',
              customerEmail: user?.email || '',
              eventTitle: eventTitle || 'Event',
              eventDate: eventDate || new Date().toISOString(),
              eventTime: new Date(eventDate || new Date()).toLocaleTimeString(),
              eventLocation: eventLocation || 'TBD',
              tickets: tickets.map(ticket => ({
                id: ticket.id,
                ticketType: 'General',
                qrCode: ticket.qr_code || '',
                holderName: ticket.holder_name || 'Ticket Holder'
              })),
              orderTotal: orderResult.order.total_amount,
              orderId: orderResult.order.id
            };
            await EmailService.sendTicketConfirmation(emailData);
            console.log('Email sent successfully');
            
            toast.success("Payment successful! Your tickets have been purchased and sent to your email.");
          } catch (emailError) {
            console.error('Email failed but tickets created:', emailError);
            toast.success("Payment successful! Your tickets have been purchased. Check your My Tickets page to view them.");
          }

          // Handle post-payment completion based on checkout mode
          if (seatCheckoutMode && sessionId && eventId) {
            // Complete seat purchase
            try {
              // @ts-ignore - Seat purchase completion
              const completionResult = await seatingService.completeSeatPurchase(
                sessionId,
                eventId,
                orderResult.order.id,
                user?.email || '',
                orderResult.order.customer_name || 'Ticket Holder',
                selectedGateway
              );
              console.log('Seat purchase completed:', completionResult);
              
              // Clear seat hold session
              localStorage.removeItem('seatHoldSessionId');
            } catch (seatError) {
              console.error('Seat purchase completion failed:', seatError);
              // Note: Payment already succeeded, so this is logged but not fatal
            }
          } else {
            // Clear cart for regular purchases
            clearCart();
          }
          
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

  const handleSquarePaymentToken = (token: string, paymentMethod: 'card' | 'cashapp') => {
    setSquarePaymentToken(token);
    setSquarePaymentMethod(paymentMethod);
    setError(null);
    console.log(`✅ Square ${paymentMethod} payment token received:`, token.substring(0, 20) + '...');
  };

  const handleSquarePaymentError = (error: string) => {
    setError(error);
    setSquarePaymentToken(null);
    setSquarePaymentMethod(null);
  };

  const handleCashAppSuccess = (result: any) => {
    console.log('✅ CashApp payment success:', result);
    // CashApp payment is handled directly by the component
    // The checkout will proceed when the backend confirms payment
    setError(null);
  };

  const handleCashAppError = (error: string) => {
    setError(error);
    console.error('❌ CashApp payment error:', error);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            Secure Checkout
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Complete your purchase in just a few steps
          </DialogDescription>
        </DialogHeader>

        {/* Show auth guard if user is not authenticated */}
        {!user ? (
          <CheckoutAuthGuard 
            itemCount={seatCheckoutMode ? (selectedSeats?.length || 0) : items.length}
            totalAmount={seatCheckoutMode ? seatTotal : total}
            onAuthenticated={() => {
              // The modal will re-render with authenticated user
              // and show the checkout form
            }}
          />
        ) : (
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Order Summary</h3>
              <Badge variant="secondary" className="text-xs">
                {seatCheckoutMode ? (
                  <>
                    {seatDetails?.length || 0} seat{(seatDetails?.length || 0) !== 1 ? 's' : ''} selected
                    {eventTitle && (
                      <span className="ml-2 text-xs">for {eventTitle}</span>
                    )}
                  </>
                ) : (
                  <>{items.length} item{items.length !== 1 ? 's' : ''} in your cart</>
                )}
              </Badge>
            </div>
            <div className="space-y-4">
              {/* Seat-based Checkout */}
              {seatCheckoutMode && seatDetails ? (
                <div className="space-y-4">
                  {/* Event Details */}
                  {eventTitle && (
                    <div className="bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
                      <h4 className="font-semibold">{eventTitle}</h4>
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        {eventDate && eventTime && (
                          <p className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {eventDate} at {eventTime}
                          </p>
                        )}
                        {eventLocation && (
                          <p className="text-xs mt-1 text-muted-foreground">{eventLocation}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Seat Details */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm text-gray-700">Selected Seats:</h5>
                    {seatDetails.map((seat) => (
                      <div key={seat.id} className="flex justify-between items-center p-3 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-7 rounded-md border-2 border-opacity-20 flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: seat.categoryColor, borderColor: seat.categoryColor }}
                          >
                            <span className="text-white text-xs font-bold">
                              {seat.seatNumber}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                Seat {seat.seatNumber}
                              </span>
                              {seat.isPremium && (
                                <span className="text-yellow-500 text-xs">★</span>
                              )}
                              {seat.isADA && (
                                <span className="text-blue-600 text-xs">♿</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {seat.section && <span>Section {seat.section}</span>}
                              {seat.row && <span className="ml-2">Row {seat.row}</span>}
                              <span className="ml-2">{seat.category}</span>
                            </div>
                            {seat.tableType && (
                              <div className="text-xs text-blue-600 mt-1">
                                {seat.tableType} table ({seat.tableCapacity} seats)
                              </div>
                            )}
                            {seat.amenities && seat.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {seat.amenities.map((amenity, index) => (
                                  <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${seat.price.toFixed(2)}</p>
                          {seat.isPremium && (
                            <p className="text-xs text-yellow-600">Premium</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${seatSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span>${Math.max(seatSubtotal * 0.03, 1.50).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Fee</span>
                        <span>${(seatDetails.length * 2).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-primary">${seatTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular Cart Items */
                <>
                  {items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.eventTitle}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            {item.eventDate} at {item.eventTime}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            Qty: {item.quantity}
                          </Badge>
                          <p className="font-semibold text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
        
                  {items.length > 0 && (
                    <>
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              
              {/* Continue with regular cart total display */}
              {!seatCheckoutMode && items.length > 0 && (
                <>
                  <div className="border-t pt-3 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fee</span>
                      <span>${fees.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {(items.length > 0 || seatCheckoutMode) && (
            <>
              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Instant Confirmation</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-primary" />
                  <span>100% Safe</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Select Payment Method</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred payment option</p>
                </div>
                <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway} className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        htmlFor={method.id}
                        className={`relative flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedGateway === method.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-muted hover:border-primary/30 hover:bg-accent/50'
                        }`}
                      >
                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                        <div className="flex-1 flex items-center gap-4">
                          {method.id === 'square' && (
                            <div className="p-3 bg-background rounded-lg border">
                              <CreditCardIcon className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          {method.id === 'cashapp' && (
                            <div className="p-2 bg-background rounded-lg border">
                              <CashAppLogo className="h-8" />
                            </div>
                          )}
                          {method.id === 'paypal' && (
                            <div className="p-3 bg-background rounded-lg border">
                              <PayPalLogo className="h-6" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium flex items-center gap-2">
                              {method.id === 'square' && 'Credit or Debit Card'}
                              {method.id === 'cashapp' && 'Cash App Pay'}
                              {method.id === 'paypal' && 'PayPal'}
                              {method.id === 'square' && (
                                <div className="flex gap-1 ml-auto">
                                  <VisaLogo className="h-4" />
                                  <MastercardLogo className="h-4" />
                                  <AmexLogo className="h-4" />
                                </div>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {method.id === 'paypal' && 'Fast and secure with your PayPal account'}
                              {method.id === 'square' && 'Encrypted and secure card payments'}
                              {method.id === 'cashapp' && 'Quick payment with Cash App'}
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedGateway === method.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground bg-background'
                        }`}>
                          {selectedGateway === method.id && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                      </label>
                    ))}
                </RadioGroup>
              </div>

              {/* Square Payment Form */}
              {selectedGateway === 'square' && (
                <div className="bg-accent/30 p-6 rounded-xl border">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">Card Payment</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter your card details securely below
                    </p>
                  </div>
                    <SquarePaymentSimple
                      amount={seatCheckoutMode ? seatTotal : total}
                      onPaymentToken={handleSquarePaymentToken}
                      onError={handleSquarePaymentError}
                      isProcessing={isProcessing}
                      showHeader={false}
                    />
                </div>
              )}

              {/* CashApp Payment Form */}
              {selectedGateway === 'cashapp' && (
                <CashAppPay
                  amount={seatCheckoutMode ? seatTotal : total}
                  orderId={`order_${Date.now()}`}
                  customerEmail={user?.email || ''}
                  onSuccess={handleCashAppSuccess}
                  onError={handleCashAppError}
                />
              )}
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
            <Button 
              variant="ghost" 
              onClick={onClose} 
              disabled={isProcessing}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
             {(items.length > 0 || seatCheckoutMode) && selectedGateway !== 'cashapp' && (
               <Button 
                 onClick={handleCheckout} 
                 disabled={
                   isProcessing || 
                   !user?.email || 
                   (selectedGateway === 'square' && !squarePaymentToken)
                 }
                 size="lg"
                 className="min-w-[200px]"
               >
                 {isProcessing ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Processing...
                   </>
                 ) : (
                   <>
                     <CreditCard className="w-4 h-4 mr-2" />
                     {selectedGateway === 'square' && !squarePaymentToken ? (
                       'Complete Payment Form'
                     ) : (
                       `Complete Purchase - $${
                         seatCheckoutMode ? seatTotal.toFixed(2) : total.toFixed(2)
                       }`
                     )}
                     {seatCheckoutMode && seatDetails && (
                       <span className="ml-2 text-xs opacity-80">
                         ({seatDetails.length} seat{seatDetails.length !== 1 ? 's' : ''})
                       </span>
                     )}
                   </>
                 )}
               </Button>
             )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}