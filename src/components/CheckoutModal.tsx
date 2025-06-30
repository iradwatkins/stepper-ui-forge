
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
import { MinusIcon, PlusIcon, CreditCardIcon, DollarSignIcon, Calendar, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";

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
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [step, setStep] = useState(1);
  const { items, subtotal, fees, total, totalItems, clearCart } = useCart();
  const { toast } = useToast();

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

  // Reset step when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
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

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                    <CreditCardIcon className="w-4 h-4" />
                    Credit/Debit Card
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                    <DollarSignIcon className="w-4 h-4" />
                    PayPal
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="cashapp" id="cashapp" />
                  <Label htmlFor="cashapp" className="flex items-center gap-2 cursor-pointer">
                    <DollarSignIcon className="w-4 h-4" />
                    Cash App
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Form */}
            {paymentMethod === "card" && (
              <div className="space-y-4">
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
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" />
                  </div>
                </div>
              </div>
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

            <Button onClick={handleCheckout} className="w-full" size="lg">
              Complete Purchase
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
