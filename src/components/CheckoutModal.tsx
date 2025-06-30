
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MinusIcon, PlusIcon, CreditCardIcon, DollarSignIcon, Calendar, MapPin, AlertCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { getPaymentConfig, validatePaymentConfig, logPaymentStatus } from "@/lib/payment-config";
import { OrderService } from "@/lib/services/OrderService";
import { TicketService } from "@/lib/services/TicketService";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: {
    id: number;
    title: string;
    date: string;
    time: string;
    price: number;
  };
  useCartMode?: boolean; // New prop to use cart items instead of single event
}

const CheckoutModal = ({ isOpen, onClose, event, useCartMode = false }: CheckoutModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("paypal"); // Default to PayPal
  const [step, setStep] = useState(1);
  const { items, subtotal, fees, total, totalItems, clearCart } = useCart();
  const { toast } = useToast();
  const [paymentConfigValid, setPaymentConfigValid] = useState(true);
  const [missingConfig, setMissingConfig] = useState<string[]>([]);
  
  // Customer information form state
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Determine if we're using cart mode or single event mode
  const isCartMode = useCartMode || (!event && items.length > 0);
  
  // For single event mode, calculate totals
  const singleEventSubtotal = event ? event.price * quantity : 0;
  const singleEventFees = singleEventSubtotal * 0.03;
  const singleEventTotal = singleEventSubtotal + singleEventFees;

  // Use cart totals or single event totals
  const checkoutSubtotal = isCartMode ? subtotal : singleEventSubtotal;
  const checkoutFees = isCartMode ? fees : singleEventFees;
  const checkoutTotal = isCartMode ? total : singleEventTotal;
  const checkoutItemCount = isCartMode ? totalItems : quantity;

  // Reset step and validate payment config when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      
      // Validate payment configuration
      const validation = validatePaymentConfig();
      setPaymentConfigValid(validation.isValid);
      setMissingConfig(validation.missing);
      
      // Log payment status in development
      logPaymentStatus();
    }
  }, [isOpen]);

  const getCurrentPrice = (item: any): number => {
    if (item.earlyBirdPrice && item.earlyBirdUntil) {
      const now = new Date();
      const earlyBirdEnd = new Date(item.earlyBirdUntil);
      return now <= earlyBirdEnd ? item.earlyBirdPrice : item.price;
    }
    return item.price;
  };

  const handleCheckout = async () => {
    // Validate customer information
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all customer information fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessError(null);
    setStep(2);

    try {
      // Create customer info
      const customer = {
        email: customerInfo.email,
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
      };

      // Create payment info (simulated for now)
      const payment = {
        paymentMethod,
        totalAmount: checkoutTotal,
        paymentIntentId: `sim_${Date.now()}`, // Simulated payment ID
      };

      // Convert cart items to the format expected by OrderService
      let cartItemsForOrder = items;
      
      // If not in cart mode, create a cart item from the single event
      if (!isCartMode && event) {
        cartItemsForOrder = [{
          id: `event-${event.id}`,
          ticketTypeId: `ticket-type-${event.id}`, // This would need to be actual ticket type ID
          eventId: event.id.toString(),
          quantity,
          price: event.price,
          title: `${event.title} Ticket`,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          maxPerPerson: 10,
        }];
      }

      // Step 1: Create order
      const orderResult = await OrderService.createOrder({
        customer,
        payment,
        cartItems: cartItemsForOrder,
      });

      if (!orderResult.success || !orderResult.order) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      // Step 2: Generate tickets
      const ticketResult = await TicketService.generateTickets({
        order: orderResult.order,
        orderItems: orderResult.orderItems,
      });

      if (!ticketResult.success) {
        throw new Error(ticketResult.error || 'Failed to generate tickets');
      }

      // Log email status
      if (ticketResult.emailSent) {
        console.log('✅ Ticket confirmation email sent successfully');
      } else if (ticketResult.emailError) {
        console.warn('⚠️ Ticket email failed:', ticketResult.emailError);
      }

      // Success! 
      setStep(3);
      
      // Clear cart after successful purchase if in cart mode
      if (isCartMode) {
        clearCart();
      }

      toast({
        title: "Purchase Complete!",
        description: `${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''} purchased successfully. Check your email for ticket details.`,
      });

      // Auto-close after a delay
      setTimeout(() => {
        onClose();
        setStep(1);
        setIsProcessing(false);
        // Reset customer info for next use
        setCustomerInfo({ firstName: '', lastName: '', email: '' });
      }, 3000);

    } catch (error) {
      console.error('Checkout failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setProcessError(errorMessage);
      
      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Go back to step 1 so user can try again
      setStep(1);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden checkout-modal">
        <div className="flex flex-col h-full max-h-[95vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">
              {step === 1 && "Checkout"}
              {step === 2 && "Processing Payment"}
              {step === 3 && "Payment Successful!"}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {step === 1 && (isCartMode 
                ? `Complete your purchase of ${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''}`
                : "Complete your ticket purchase"
              )}
              {step === 2 && "Please wait while we process your payment..."}
              {step === 3 && "Your tickets have been confirmed!"}
            </DialogDescription>
          </DialogHeader>

        {step === 1 && (
          <div className="flex flex-1 min-h-0 flex-col md:flex-row">
            {/* Left Column - Order Items & Summary */}
            <div className="flex-1 md:border-r">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                  {/* Order Items Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">
                        {isCartMode ? "Order Items" : "Event Details"}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {isCartMode 
                          ? `${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''} from ${new Set(items.map(item => item.eventId)).size} event${new Set(items.map(item => item.eventId)).size !== 1 ? 's' : ''}`
                          : event ? `${event.date} at ${event.time}` : ""
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isCartMode ? (
                        <div className="space-y-3 max-h-48 sm:max-h-60 lg:max-h-80 overflow-y-auto">
                          {items.map((item) => {
                            const currentPrice = getCurrentPrice(item);
                            const itemTotal = currentPrice * item.quantity;
                            return (
                              <div key={item.id} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg border">
                                <div className="flex-1 min-w-0 pr-3">
                                  <h4 className="font-medium text-sm leading-tight">{item.eventTitle}</h4>
                                  <p className="text-sm text-muted-foreground leading-tight mt-1">{item.title}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{item.eventDate}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">{item.eventTime}</span>
                                  </div>
                                  {item.eventLocation && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{item.eventLocation}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-semibold text-sm">${itemTotal.toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.quantity} × ${currentPrice.toFixed(2)}
                                  </div>
                                  {item.earlyBirdPrice && item.earlyBirdUntil && currentPrice === item.earlyBirdPrice && (
                                    <Badge variant="secondary" className="text-xs mt-1">Early Bird</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        event && (
                          <div className="p-3 bg-muted/30 rounded-lg border">
                            <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                  disabled={quantity <= 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <MinusIcon className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center text-sm">{quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setQuantity(quantity + 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <PlusIcon className="w-3 h-3" />
                                </Button>
                              </div>
                              <span className="font-medium text-sm">${event.price} each</span>
                            </div>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Summary Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg lg:text-xl">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 lg:space-y-4">
                      <div className="flex justify-between text-sm lg:text-base">
                        <span>Subtotal ({checkoutItemCount} ticket{checkoutItemCount !== 1 ? 's' : ''})</span>
                        <span className="font-medium">${checkoutSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm lg:text-base text-muted-foreground">
                        <span>Processing Fee (3%)</span>
                        <span>${checkoutFees.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-base sm:text-lg lg:text-xl">
                        <span>Total</span>
                        <span>${checkoutTotal.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>

            {/* Right Column - Payment & Customer Info */}
            <div className="w-full md:w-96 lg:w-[400px] xl:w-[450px] flex-shrink-0 md:border-t-0 border-t">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                  
                  {/* Payment Configuration Warning */}
                  {!paymentConfigValid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Payment configuration incomplete. Missing: {missingConfig.join(', ')}
                        <br />
                        Please add the required environment variables to enable payments.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Payment Method Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">Payment Method</CardTitle>
                      <CardDescription className="text-sm">Choose your preferred payment option</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3 lg:space-y-4">
                        <div className="flex items-center space-x-3 p-3 lg:p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                          <RadioGroupItem value="paypal" id="paypal" />
                          <Label htmlFor="paypal" className="flex items-center gap-2 lg:gap-3 cursor-pointer flex-1">
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" viewBox="0 0 24 24" fill="#003087">
                              <path d="M8.32 20.32c-.24 0-.44-.19-.46-.43L7.1 15.6c-.02-.29.21-.54.5-.54h2.8c1.45 0 2.77-.59 3.72-1.66.95-1.07 1.36-2.47 1.16-3.94-.2-1.47-1.06-2.73-2.42-3.55C11.22 5.09 9.47 4.68 7.7 5.05L5.3 5.56c-.36.07-.62.39-.59.76l1.75 12.89c.02.29-.19.55-.48.57-.01 0-.02 0-.03 0H3.5c-.28 0-.51-.23-.51-.51 0-.01 0-.02 0-.03L1.2 5.35c-.07-.54.31-1.03.85-1.1l2.91-.57c2.33-.46 4.7.11 6.68 1.59 1.98 1.48 3.19 3.61 3.41 6 .22 2.39-.46 4.7-1.92 6.5-1.46 1.8-3.57 2.83-5.94 2.9L8.32 20.32z"/>
                            </svg>
                            <span className="font-medium text-sm lg:text-base">PayPal</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 lg:p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                          <RadioGroupItem value="square" id="square" />
                          <Label htmlFor="square" className="flex items-center gap-2 lg:gap-3 cursor-pointer flex-1">
                            <CreditCardIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            <span className="font-medium text-sm lg:text-base">Square</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 lg:p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                          <RadioGroupItem value="cashapp" id="cashapp" />
                          <Label htmlFor="cashapp" className="flex items-center gap-2 lg:gap-3 cursor-pointer flex-1">
                            <DollarSignIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            <span className="font-medium text-sm lg:text-base">Cash App</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  {/* Customer Information Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">Customer Information</CardTitle>
                      <CardDescription className="text-sm">Enter your details for the ticket purchase</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                          <Input 
                            id="firstName" 
                            placeholder="John" 
                            value={customerInfo.firstName}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                            className="h-9 sm:h-10 lg:h-11 text-sm lg:text-base transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                          <Input 
                            id="lastName" 
                            placeholder="Doe" 
                            value={customerInfo.lastName}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                            className="h-9 sm:h-10 lg:h-11 text-sm lg:text-base transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="john@example.com" 
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                          className="h-9 sm:h-10 lg:h-11 text-sm lg:text-base transition-all"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Instructions */}
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <AlertDescription className="text-sm">
                      {paymentMethod === "paypal" && "You will be redirected to PayPal to complete your payment securely."}
                      {paymentMethod === "square" && "You will be redirected to Square to complete your payment securely."}
                      {paymentMethod === "cashapp" && "You will be redirected to Cash App to complete your payment securely."}
                    </AlertDescription>
                  </Alert>
                  
                  {/* Checkout Button */}
                  {/* Error display */}
                  {processError && (
                    <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm text-red-700 dark:text-red-300">
                        {processError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    onClick={handleCheckout} 
                    className="w-full h-11 lg:h-12 text-base lg:text-lg font-semibold transition-all" 
                    disabled={!paymentConfigValid || isProcessing}
                  >
                    {isProcessing ? "Processing..." : 
                     paymentConfigValid 
                      ? `Complete Purchase - $${checkoutTotal.toFixed(2)}`
                      : "Payment Configuration Required"
                    }
                  </Button>
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
              <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
              <p className="text-muted-foreground">Please wait while we process your payment...</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
              <p className="text-muted-foreground">
                Your tickets have been generated and sent to {customerInfo.email}. 
                Check your email for ticket details and QR codes.
              </p>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
