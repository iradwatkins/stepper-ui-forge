import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Ticket,
  CheckCircle,
  AlertCircle,
  Lock,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { PayPalLogo, CashAppLogo, CreditCardIcon } from "@/components/payment/PaymentLogos";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { productionPaymentService } from "@/lib/payments/ProductionPaymentService";
import { SquarePaymentSimple } from "@/components/payments/SquarePaymentSimple";
import { CashAppPay } from "@/components/payment/CashAppPay";
import { CheckoutAuthGuard } from "@/components/auth/CheckoutAuthGuard";
import { toast } from "sonner";

interface CheckoutPageProps {
  onBack: () => void;
  onComplete: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

export function CheckoutPage({ onBack, onComplete }: CheckoutPageProps) {
  const { items, total, subtotal, fees, clearCart } = useCart();
  const { user } = useAuth();
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    email: user?.email || '',
    fullName: user?.user_metadata?.full_name || '',
    phone: ''
  });
  
  // Payment state
  const [selectedPayment, setSelectedPayment] = useState<string>('square');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [squarePaymentToken, setSquarePaymentToken] = useState<string | null>(null);
  
  // UI state
  const [currentStep, setCurrentStep] = useState<'info' | 'payment' | 'review'>('info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await productionPaymentService.getAvailablePaymentMethods();
        
        const formattedMethods: PaymentMethod[] = methods.map(method => ({
          id: method.id,
          name: method.name,
          description: method.description,
          icon: method.id === 'square' ? <CreditCardIcon className="w-6 h-6" /> :
                method.id === 'cashapp' ? <CashAppLogo className="h-6" /> :
                method.id === 'paypal' ? <PayPalLogo className="h-6" /> :
                <CreditCard className="w-6 h-6" />,
          available: method.available
        }));
        
        setPaymentMethods(formattedMethods);
        setSelectedPayment(formattedMethods.find(m => m.available)?.id || 'square');
      } catch (error) {
        console.error('Failed to load payment methods:', error);
        setPaymentMethods([
          {
            id: 'square',
            name: 'Credit Card',
            description: 'Pay with credit or debit card',
            icon: <CreditCardIcon className="w-6 h-6" />,
            available: true
          }
        ]);
      }
    };
    
    loadPaymentMethods();
  }, []);

  // Validation
  const validateStep = (step: string): boolean => {
    const errors: Record<string, string> = {};
    
    if (step === 'info') {
      if (!customerInfo.email) errors.email = 'Email is required';
      if (!customerInfo.fullName) errors.fullName = 'Full name is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
        errors.email = 'Please enter a valid email';
      }
    }
    
    if (step === 'payment') {
      if (selectedPayment === 'square' && !squarePaymentToken) {
        errors.payment = 'Please complete payment information';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStepForward = () => {
    if (currentStep === 'info' && validateStep('info')) {
      setCurrentStep('payment');
    } else if (currentStep === 'payment' && validateStep('payment')) {
      setCurrentStep('review');
    }
  };

  const handleStepBack = () => {
    if (currentStep === 'review') setCurrentStep('payment');
    else if (currentStep === 'payment') setCurrentStep('info');
    else onBack();
  };

  const handleSquarePaymentToken = (token: string) => {
    setSquarePaymentToken(token);
    setError(null);
    setValidationErrors({});
  };

  const handleSquarePaymentError = (error: string) => {
    setError(error);
    setSquarePaymentToken(null);
  };

  const processPayment = async () => {
    if (!validateStep('payment')) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const orderId = `order_${Date.now()}_${user?.id || 'guest'}`;
      
      const paymentData = {
        amount: Math.round(total * 100), // Convert to cents
        gateway: selectedPayment,
        orderId,
        customerEmail: customerInfo.email,
        ...(selectedPayment === 'square' && squarePaymentToken && {
          sourceId: squarePaymentToken
        })
      };

      const result = await productionPaymentService.processPayment(paymentData);

      if (result.success) {
        // Handle redirect flows
        if (result.requiresAction) {
          if (result.action === 'approve_paypal_order') {
            sessionStorage.setItem('pendingPayPalOrder', JSON.stringify({
              paypalOrderId: result.data.paypalOrderId,
              orderId,
              customerEmail: customerInfo.email,
              amount: Math.round(total * 100),
              items
            }));
            
            if (result.data.approvalUrl) {
              window.location.href = result.data.approvalUrl;
              return;
            }
          }
        }
        
        // Payment completed successfully
        toast.success("Payment successful! Your tickets are being processed.");
        clearCart();
        onComplete();
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

  if (!user) {
    return (
      <CheckoutAuthGuard
        itemCount={items.length}
        totalAmount={total}
        onAuthenticated={() => {}}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">Add some tickets to continue with checkout</p>
              <Button onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={handleStepBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">Complete your ticket purchase</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          {[
            { key: 'info', label: 'Information', icon: User },
            { key: 'payment', label: 'Payment', icon: CreditCard },
            { key: 'review', label: 'Review', icon: CheckCircle }
          ].map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = 
              (step.key === 'info' && ['payment', 'review'].includes(currentStep)) ||
              (step.key === 'payment' && currentStep === 'review');
            
            return (
              <div key={step.key} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-primary border-primary text-white' :
                    'border-muted-foreground text-muted-foreground'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-2 font-medium ${
                  isActive ? 'text-primary' : 
                  isCompleted ? 'text-green-600' : 
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
                {index < 2 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-muted-foreground/20'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information Step */}
          {currentStep === 'info' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>
                  We'll use this information for your tickets and receipt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        className="pl-10"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-sm text-destructive">{validationErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Smith"
                        className="pl-10"
                        value={customerInfo.fullName}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    {validationErrors.fullName && (
                      <p className="text-sm text-destructive">{validationErrors.fullName}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method Step */}
          {currentStep === 'payment' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>
                    Choose how you'd like to pay for your tickets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {paymentMethods.filter(method => method.available).map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                          selectedPayment === method.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border'
                        }`}
                        onClick={() => setSelectedPayment(method.id)}
                      >
                        <div className="flex items-center gap-3">
                          {method.icon}
                          <div className="flex-1">
                            <h4 className="font-medium">{method.name}</h4>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedPayment === method.id
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Square Payment Form */}
              {selectedPayment === 'square' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Card Details
                    </CardTitle>
                    <CardDescription>
                      Your payment information is secured with SSL encryption
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SquarePaymentSimple
                      amount={total}
                      onPaymentToken={handleSquarePaymentToken}
                      onError={handleSquarePaymentError}
                      isProcessing={isProcessing}
                      showHeader={false}
                    />
                  </CardContent>
                </Card>
              )}

              {/* CashApp Payment */}
              {selectedPayment === 'cashapp' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cash App Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CashAppPay
                      amount={total}
                      orderId={`order_${Date.now()}`}
                      customerEmail={customerInfo.email}
                      onSuccess={() => {
                        toast.success("Cash App payment initiated");
                        setError(null);
                      }}
                      onError={setError}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Review Your Order
                </CardTitle>
                <CardDescription>
                  Please review your information before completing the purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info Review */}
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{customerInfo.fullName}</p>
                    <p>{customerInfo.email}</p>
                    {customerInfo.phone && <p>{customerInfo.phone}</p>}
                  </div>
                </div>

                <Separator />

                {/* Payment Method Review */}
                <div>
                  <h4 className="font-medium mb-2">Payment Method</h4>
                  <div className="flex items-center gap-2">
                    {paymentMethods.find(m => m.id === selectedPayment)?.icon}
                    <span className="text-sm">
                      {paymentMethods.find(m => m.id === selectedPayment)?.name}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleStepBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {currentStep !== 'review' ? (
              <Button onClick={handleStepForward}>
                Continue
              </Button>
            ) : (
              <Button 
                onClick={processPayment} 
                disabled={isProcessing || (selectedPayment === 'square' && !squarePaymentToken)}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Complete Purchase - ${total.toFixed(2)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.eventTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Qty: {item.quantity}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {item.eventDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing Fee:</span>
                  <span>${fees.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Secure 256-bit SSL encryption</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}