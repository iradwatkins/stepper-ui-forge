
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
import { MinusIcon, PlusIcon, CreditCardIcon, DollarSignIcon, BanknoteIcon, Calendar, MapPin, AlertCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { getPaymentConfig, validatePaymentConfig, logPaymentStatus } from "@/lib/payment-config";
import { CashPaymentService } from "@/lib/services/CashPaymentService";
import { AtomicOrderService } from "@/lib/services/AtomicOrderService";
import { useCartInventoryValidation } from "@/lib/hooks/useRealTimeInventory";

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
  
  // Reservation state
  const [reservationIds, setReservationIds] = useState<string[]>([]);
  const [holdingInventory, setHoldingInventory] = useState(false);
  
  // Cash payment state
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);

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
  
  // Prepare cart items for validation
  const cartItemsForValidation = isCartMode 
    ? items.map(item => ({ ticket_type_id: item.ticketTypeId, quantity: item.quantity }))
    : event 
    ? [{ ticket_type_id: `ticket-type-${event.id}`, quantity }]
    : [];
  
  // Real-time inventory validation
  const { validationErrors, isValid: inventoryValid, loading: inventoryLoading } = 
    useCartInventoryValidation(cartItemsForValidation);

  // Reset step and validate payment config when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReservationIds([]);
      setHoldingInventory(false);
      
      // Validate payment configuration
      const validation = validatePaymentConfig();
      setPaymentConfigValid(validation.isValid);
      setMissingConfig(validation.missing);
      
      // Log payment status in development
      logPaymentStatus();
    } else {
      // Release any active reservations when modal closes
      if (reservationIds.length > 0) {
        AtomicOrderService.extendReservations(reservationIds, 0); // Release immediately
      }
    }
  }, [isOpen, reservationIds]);

  const getCurrentPrice = (item: { price: number; earlyBirdPrice?: number; earlyBirdUntil?: string }): number => {
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
    
    // Check inventory availability
    if (!inventoryValid) {
      toast({
        title: "Tickets No Longer Available",
        description: "Some tickets in your cart are no longer available. Please adjust your selection.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessError(null);
    setHoldingInventory(true);

    try {
      // Create customer info
      const customer = {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
      };
      
      // Create payment info
      const payment = {
        method: paymentMethod as 'stripe' | 'cash_app' | 'cash',
        amount: checkoutTotal,
        ...(paymentMethod === 'cash' && { cash_verification_code: `cash_${Date.now()}` })
      };

      // Convert cart items to the format expected by AtomicOrderService
      let cartItemsForOrder = items.map(item => ({
        ticket_type_id: item.ticketTypeId,
        quantity: item.quantity,
        price: getCurrentPrice(item),
        ticket_type_name: item.title
      }));
      
      // If not in cart mode, create a cart item from the single event
      if (!isCartMode && event) {
        cartItemsForOrder = [{
          ticket_type_id: `ticket-type-${event.id}`, // This would need to be actual ticket type ID
          quantity,
          price: event.price,
          ticket_type_name: `${event.title} Ticket`
        }];
      }
      
      setStep(2);
      
      // Use atomic order service for all purchases
      const orderResult = await AtomicOrderService.createAtomicOrder(
        customer,
        payment,
        cartItemsForOrder
      );
      
      if (!orderResult.success) {
        if (orderResult.errorCode === 'INSUFFICIENT_INVENTORY' && orderResult.availabilityErrors) {
          const errorMessages = orderResult.availabilityErrors.map(err => 
            `Ticket type ${err.ticketTypeId}: ${err.requested} requested, ${err.available} available`
          ).join('\n');
          
          throw new Error(`Some tickets are no longer available:\n${errorMessages}`);
        }
        
        throw new Error(orderResult.error || 'Failed to create order');
      }

      // Handle cash payment specific logic
      if (paymentMethod === 'cash') {
        // For cash payments, we need to generate a verification code
        const cashPaymentResult = await CashPaymentService.createCashPayment({
          orderId: orderResult.orderId!,
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          totalAmount: checkoutTotal
        });

        if (cashPaymentResult.success) {
          setVerificationCode(cashPaymentResult.verificationCode!);
          setCodeExpiresAt(cashPaymentResult.expiresAt!);
        }
      }
      
      // Success!
      setStep(3);
      
      // Clear cart after successful purchase if in cart mode
      if (isCartMode) {
        clearCart();
      }

      toast({
        title: paymentMethod === 'cash' ? "Cash Order Created!" : "Purchase Complete!",
        description: paymentMethod === 'cash' 
          ? "Order created successfully. Please provide the verification code when paying cash to the organizer."
          : `${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''} purchased successfully. Check your email for ticket details.`,
      });

      // Auto-close after a delay (longer for cash payments so users can note the code)
      const autoCloseDelay = paymentMethod === 'cash' ? 10000 : 3000; // 10 seconds for cash, 3 for digital
      setTimeout(() => {
        onClose();
        setStep(1);
        setIsProcessing(false);
        setHoldingInventory(false);
        // Reset customer info and cash payment state for next use
        setCustomerInfo({ firstName: '', lastName: '', email: '' });
        setVerificationCode(null);
        setCodeExpiresAt(null);
        setReservationIds([]);
      }, autoCloseDelay);

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
      setHoldingInventory(false);
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
              {step === 3 && (paymentMethod === 'cash' ? "Cash Order Created!" : "Payment Successful!")}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {step === 1 && (isCartMode 
                ? `Complete your purchase of ${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''}`
                : "Complete your ticket purchase"
              )}
              {step === 2 && "Please wait while we process your payment..."}
              {step === 3 && (paymentMethod === 'cash' ? "Present this verification code when paying cash" : "Your tickets have been confirmed!")}
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
                  
                  {/* Inventory Validation Warnings */}
                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <div className="font-medium mb-1">Tickets No Longer Available:</div>
                        {validationErrors.map((error, index) => (
                          <div key={index} className="text-xs">
                            • {error.error}
                          </div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Inventory Loading */}
                  {inventoryLoading && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Checking ticket availability...
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
                        <div className="flex items-center space-x-3 p-3 lg:p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                          <RadioGroupItem value="cash" id="cash" />
                          <Label htmlFor="cash" className="flex items-center gap-2 lg:gap-3 cursor-pointer flex-1">
                            <BanknoteIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            <span className="font-medium text-sm lg:text-base">Cash (In-Person)</span>
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
                    disabled={!paymentConfigValid || isProcessing || !inventoryValid || inventoryLoading}
                  >
                    {isProcessing ? (holdingInventory ? "Reserving Tickets..." : "Processing...") : 
                     !inventoryValid ? "Tickets Unavailable" :
                     inventoryLoading ? "Checking Availability..." :
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
              <h3 className="text-lg font-semibold mb-2">
                {holdingInventory ? "Reserving Tickets" : "Processing Payment"}
              </h3>
              <p className="text-muted-foreground">
                {holdingInventory 
                  ? "Securing your tickets and processing payment..."
                  : "Please wait while we process your payment..."
                }
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center max-w-md mx-auto px-4">
              {paymentMethod === 'cash' ? (
                // Cash payment success
                <>
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BanknoteIcon className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-4">Cash Order Created!</h3>
                  
                  {verificationCode && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Verification Code:</p>
                      <div className="text-2xl font-mono font-bold tracking-wider text-center py-2 px-4 bg-white dark:bg-gray-900 rounded border-2 border-dashed border-gray-300 dark:border-gray-600">
                        {verificationCode}
                      </div>
                      {codeExpiresAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expires: {codeExpiresAt.toLocaleDateString()} at {codeExpiresAt.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Present this verification code when paying cash to the event organizer. 
                    Your tickets will be generated and sent to {customerInfo.email} after payment confirmation.
                  </p>
                  
                  <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                    💡 A copy of this verification code has been sent to your email.
                  </div>
                </>
              ) : (
                // Digital payment success
                <>
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
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
