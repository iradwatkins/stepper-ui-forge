import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CreditCard, Loader2, ShoppingCart, Shield, Lock, CheckCircle, X } from "lucide-react";
import { PayPalLogo, CashAppLogo, CreditCardIcon, VisaLogo, MastercardLogo, AmexLogo } from "@/components/payment/PaymentLogos";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { productionPaymentService } from "@/lib/payments/ProductionPaymentService";
import { OrderService } from "@/lib/services/OrderService";
import { TicketService } from "@/lib/services/TicketService";
import { EmailService } from "@/lib/services/EmailService";
import { seatingService } from "@/lib/services/SeatingService";
import { CheckoutAuthGuard } from "@/components/auth/CheckoutAuthGuard";
import { EmergencySquareCard, type EmergencySquareCardRef } from "@/components/payment/EmergencySquareCard";
import { EmergencyCashApp } from "@/components/payment/EmergencyCashApp";
import { SquareDiagnostic } from "@/components/payment/SquareDiagnostic";
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
  const { items, total, subtotal, fees, clearCart, showThankYou } = useCart();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>('paypal');
  const customerEmail = user?.email || '';
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; available: boolean }[]>([]);
  const [seatCheckoutMode, setSeatCheckoutMode] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seatSubtotal, setSeatSubtotal] = useState(0);
  const [seatTotal, setSeatTotal] = useState(0);
  const [squarePaymentToken, setSquarePaymentToken] = useState<string | null>(null);
  const [squarePaymentMethod, setSquarePaymentMethod] = useState<'card' | 'cashapp' | null>(null);
  const squareCardRef = useRef<EmergencySquareCardRef>(null);

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

    if (!customerEmail) {
      setError("Please enter your email address");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // For Square payments, tokenize the card first
      if (selectedGateway === 'square') {
        if (!squareCardRef.current?.isReady) {
          setError("Payment form is not ready. Please wait and try again.");
          setIsProcessing(false);
          return;
        }
        
        // Tokenize the card
        try {
          await squareCardRef.current.tokenize();
          // Token will be set via the onSuccess callback
          // Wait a moment for the token to be set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (!squarePaymentToken) {
            setError("Failed to process card information. Please try again.");
            setIsProcessing(false);
            return;
          }
        } catch (tokenError) {
          console.error('Tokenization error:', tokenError);
          setIsProcessing(false);
          return;
        }
      }
      
      const orderId = `order_${Date.now()}_${user?.id || 'guest'}`;
      
      const paymentData = {
        amount: Math.round((seatCheckoutMode ? seatTotal : total) * 100), // Convert to cents
        gateway: selectedGateway,
        orderId,
        customerEmail,
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
            customerEmail,
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
            customerEmail,
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
              email: customerEmail,
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
                eventLocation: eventLocation || ''
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
              customerEmail: customerEmail,
              eventTitle: tickets[0]?.ticket_types?.events?.title || eventTitle || 'Event',
              eventDate: tickets[0]?.ticket_types?.events?.date || new Date().toISOString(),
              eventTime: new Date(tickets[0]?.ticket_types?.events?.date || new Date()).toLocaleTimeString(),
              eventLocation: tickets[0]?.ticket_types?.events?.venue || tickets[0]?.ticket_types?.events?.location || eventLocation || 'TBD',
              tickets: tickets.map(ticket => ({
                id: ticket.id,
                ticketType: ticket.ticket_types?.name || 'General',
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
                customerEmail,
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
          
          // Show thank you modal with order details
          showThankYou({
            orderId: orderResult.order.id,
            customerEmail: customerEmail,
            totalAmount: orderResult.order.total_amount,
            ticketCount: tickets.length,
            eventTitle: tickets[0]?.ticket_types?.events?.title || eventTitle,
            eventDate: tickets[0]?.ticket_types?.events?.date || eventDate
          });
          
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
      <DialogContent className="w-[95vw] max-w-md max-h-[95vh] overflow-y-auto bg-gray-50 border-0 p-0">
        {/* Accessibility: DialogTitle is required but visually hidden */}
        <DialogTitle className="sr-only">Complete Your Purchase - Secure Checkout</DialogTitle>
        
        {/* Modern Header */}
        <div className="bg-white p-6 border-b">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Complete Your Purchase</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-500" />
              Secure Checkout
            </div>
          </div>
        </div>

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
        <div className="p-6 space-y-6">
          {/* Modern Order Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900">Order Summary</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {seatCheckoutMode ? (
                  <>
                    {seatDetails?.length || 0} seat{(seatDetails?.length || 0) !== 1 ? 's' : ''} selected
                    {eventTitle && (
                      <span className="ml-2">for {eventTitle}</span>
                    )}
                  </>
                ) : (
                  <>{items.length} item{items.length !== 1 ? 's' : ''} in your cart</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seat-based Checkout */}
              {seatCheckoutMode && seatDetails ? (
                <div className="space-y-4">
                  {/* Event Details */}
                  {eventTitle && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900">{eventTitle}</h4>
                      <div className="text-sm text-blue-800 mt-1">
                        {eventDate && eventTime && (
                          <p>{eventDate} at {eventTime}</p>
                        )}
                        {eventLocation && (
                          <p className="text-xs mt-1">{eventLocation}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Seat Details */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm text-gray-700">Selected Seats:</h5>
                    {seatDetails.map((seat) => (
                      <div key={seat.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-6 h-5 rounded-sm border border-gray-300 flex items-center justify-center"
                            style={{ backgroundColor: seat.categoryColor }}
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
                  
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${seatSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Processing Fee (3%):</span>
                      <span>${Math.max(seatSubtotal * 0.03, 1.50).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Service Fee (${seatDetails.length} seats):</span>
                      <span>${(seatDetails.length * 2).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${seatTotal.toFixed(2)}</span>
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
                      </div>
                    </>
                  )}
                </>
              )}
              
              {/* Continue with regular cart total display */}
              {!seatCheckoutMode && items.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
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

          {(items.length > 0 || seatCheckoutMode) && (
            <>

              {/* Emergency Diagnostic - TEMPORARY */}
              {import.meta.env.DEV && <SquareDiagnostic />}
              
              {/* Modern Payment Method Selection */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-gray-900">Select Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-6 sm:grid-cols-3 xs:grid-cols-1">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        className={`relative bg-white border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 min-h-[80px] flex flex-col items-center justify-center gap-2 hover:border-gray-300 hover:shadow-sm ${
                          selectedGateway === method.id
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedGateway(method.id)}
                      >
                        {selectedGateway === method.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="w-8 h-8 flex items-center justify-center">
                          {method.id === 'square' && <CreditCardIcon className="h-8 w-8 text-gray-700" />}
                          {method.id === 'cashapp' && <CashAppLogo className="h-8" />}
                          {method.id === 'paypal' && <PayPalLogo className="h-6" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {method.id === 'square' && 'Card'}
                          {method.id === 'cashapp' && 'Cash App'}
                          {method.id === 'paypal' && 'PayPal'}
                        </span>
                      </button>
                    ))}
                  </div>
                 </CardContent>
               </Card>

               {/* EMERGENCY Square Payment Form - Using hardcoded credentials */}
               {selectedGateway === 'square' && (
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Card Information</label>
                     <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 hover:border-gray-400 focus-within:border-green-500 transition-colors">
                       <EmergencySquareCard
                         ref={squareCardRef}
                         amount={seatCheckoutMode ? seatTotal : total}
                         onSuccess={handleSquarePaymentToken}
                         onError={handleSquarePaymentError}
                         isProcessing={isProcessing}
                       />
                     </div>
                   </div>
                 </div>
               )}

               {/* EMERGENCY CashApp Payment Form - Using hardcoded credentials */}
               {selectedGateway === 'cashapp' && (
                 <div className="space-y-4">
                   <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[80px]">
                     <EmergencyCashApp
                       amount={seatCheckoutMode ? seatTotal : total}
                       orderId={`order_${Date.now()}`}
                       customerEmail={customerEmail}
                       onSuccess={handleCashAppSuccess}
                       onError={handleCashAppError}
                     />
                   </div>
                   <p className="text-center text-sm text-gray-600">
                     Click the Cash App button above to complete payment
                   </p>
                 </div>
               )}
             </>
           )}

           {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Modern Submit Button */}
          {(items.length > 0 || seatCheckoutMode) && selectedGateway !== 'cashapp' && (
            <Button 
              onClick={handleCheckout} 
              disabled={
                isProcessing || 
                !customerEmail || 
                (selectedGateway === 'square' && !squareCardRef.current?.isReady)
              }
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ${seatCheckoutMode ? seatTotal.toFixed(2) : total.toFixed(2)}
                </>
              )}
            </Button>
          )}

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-5 h-5 text-gray-500" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-5 h-5 text-gray-500" />
              <span>PCI Compliant</span>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}