
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

  const handleCheckout = () => {
    // Simulate checkout process
    setStep(2);
    setTimeout(() => {
      setStep(3);
      setTimeout(() => {
        // Clear cart after successful purchase if in cart mode
        if (isCartMode) {
          clearCart();
          toast({
            title: "Purchase Complete!",
            description: `${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''} purchased successfully.`,
          });
        }
        onClose();
        setStep(1);
      }, 2000);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Checkout"}
            {step === 2 && "Processing Payment"}
            {step === 3 && "Payment Successful!"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && (isCartMode 
              ? `Complete your purchase of ${checkoutItemCount} ticket${checkoutItemCount !== 1 ? 's' : ''}`
              : "Complete your ticket purchase"
            )}
            {step === 2 && "Please wait while we process your payment..."}
            {step === 3 && "Your tickets have been confirmed!"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {/* Items Summary */}
            {isCartMode ? (
              /* Multi-Item Cart Mode */
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                  <CardDescription>
                    {checkoutItemCount} ticket{checkoutItemCount !== 1 ? 's' : ''} from {new Set(items.map(item => item.eventId)).size} event{new Set(items.map(item => item.eventId)).size !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="max-h-40">
                    <div className="space-y-3">
                      {items.map((item) => {
                        const currentPrice = getCurrentPrice(item);
                        const itemTotal = currentPrice * item.quantity;
                        return (
                          <div key={item.id} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.eventTitle}</h4>
                              <p className="text-sm text-muted-foreground truncate">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{item.eventDate}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{item.eventTime}</span>
                              </div>
                            </div>
                            <div className="text-right ml-2">
                              <div className="font-medium text-sm">${itemTotal.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.quantity} × ${currentPrice.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              /* Single Event Mode (Legacy) */
              event && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.date} at {event.time}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <MinusIcon className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          <PlusIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      <span className="font-medium">${event.price} each</span>
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {/* Payment Configuration Warning */}
            {!paymentConfigValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment configuration incomplete. Missing: {missingConfig.join(', ')}
                  <br />
                  Please add the required environment variables to enable payments.
                </AlertDescription>
              </Alert>
            )}

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#003087">
                      <path d="M8.32 20.32c-.24 0-.44-.19-.46-.43L7.1 15.6c-.02-.29.21-.54.5-.54h2.8c1.45 0 2.77-.59 3.72-1.66.95-1.07 1.36-2.47 1.16-3.94-.2-1.47-1.06-2.73-2.42-3.55C11.22 5.09 9.47 4.68 7.7 5.05L5.3 5.56c-.36.07-.62.39-.59.76l1.75 12.89c.02.29-.19.55-.48.57-.01 0-.02 0-.03 0H3.5c-.28 0-.51-.23-.51-.51 0-.01 0-.02 0-.03L1.2 5.35c-.07-.54.31-1.03.85-1.1l2.91-.57c2.33-.46 4.7.11 6.68 1.59 1.98 1.48 3.19 3.61 3.41 6 .22 2.39-.46 4.7-1.92 6.5-1.46 1.8-3.57 2.83-5.94 2.9L8.32 20.32z"/>
                    </svg>
                    PayPal
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="square" id="square" />
                  <Label htmlFor="square" className="flex items-center gap-2 cursor-pointer">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000">
                      <path d="M4.01 4.01h15.98v15.98H4.01V4.01zm1.6 1.6v12.78h12.78V5.61H5.61z"/>
                      <path d="M7.21 7.21h9.58v9.58H7.21V7.21zm1.6 1.6v6.38h6.38V8.81H8.81z"/>
                    </svg>
                    Square
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="cashapp" id="cashapp" />
                  <Label htmlFor="cashapp" className="flex items-center gap-2 cursor-pointer">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00C851">
                      <path d="M23.59 3.47c-.86.21-1.8.35-2.78.41 1-.6 1.77-1.55 2.13-2.68-.93.55-1.96.95-3.06 1.17-.88-.94-2.13-1.53-3.52-1.53-2.66 0-4.82 2.16-4.82 4.82 0 .38.04.75.13 1.1-4-.2-7.56-2.12-9.93-5.04-.42.72-.66 1.55-.66 2.44 0 1.67.85 3.15 2.14 4.01-.79-.02-1.53-.24-2.18-.6v.06c0 2.34 1.66 4.29 3.87 4.73-.4.11-.83.17-1.27.17-.31 0-.62-.03-.92-.08.62 1.94 2.42 3.35 4.55 3.39-1.67 1.31-3.77 2.09-6.05 2.09-.39 0-.78-.02-1.17-.07 2.18 1.4 4.77 2.21 7.56 2.21 9.05 0 14-7.5 14-14 0-.21 0-.42-.01-.63.96-.69 1.79-1.56 2.45-2.55z"/>
                    </svg>
                    Cash App
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Customer Information</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
            </div>

            {/* Payment Method Instructions */}
            {paymentMethod === "paypal" && (
              <Alert>
                <AlertDescription>
                  You will be redirected to PayPal to complete your payment securely.
                </AlertDescription>
              </Alert>
            )}

            {paymentMethod === "square" && (
              <Alert>
                <AlertDescription>
                  You will be redirected to Square to complete your payment securely.
                </AlertDescription>
              </Alert>
            )}

            {paymentMethod === "cashapp" && (
              <Alert>
                <AlertDescription>
                  You will be redirected to Cash App to complete your payment securely.
                </AlertDescription>
              </Alert>
            )}

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal ({checkoutItemCount} ticket{checkoutItemCount !== 1 ? 's' : ''})</span>
                  <span>${checkoutSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing Fee</span>
                  <span>${checkoutFees.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>${checkoutTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleCheckout} 
              className="w-full" 
              size="lg"
              disabled={!paymentConfigValid}
            >
              {paymentConfigValid 
                ? `Complete Purchase - ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`
                : "Payment Configuration Required"
              }
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Processing your payment...</p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted-foreground">Check your email for ticket details!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
