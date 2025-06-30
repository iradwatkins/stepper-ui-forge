import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BanknoteIcon, CheckCircleIcon, ClockIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CashPaymentService } from "@/lib/services/CashPaymentService";

interface PendingCashPayment {
  id: string;
  verificationCode: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  expiresAt: Date;
  eventTitle: string;
  isExpired: boolean;
}

interface CashPaymentDashboardProps {
  organizerId: string;
}

export default function CashPaymentDashboard({ organizerId }: CashPaymentDashboardProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingCashPayment[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load pending cash payments
  useEffect(() => {
    loadPendingPayments();
  }, [organizerId]);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const payments = await CashPaymentService.getPendingCashPayments(organizerId);
      setPendingPayments(payments);
    } catch (error) {
      console.error('Failed to load pending payments:', error);
      toast({
        title: "Error",
        description: "Failed to load pending cash payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (code?: string) => {
    const codeToConfirm = code || verificationCode.trim().toUpperCase();
    
    if (!codeToConfirm) {
      toast({
        title: "Error",
        description: "Please enter a verification code",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    
    try {
      const result = await CashPaymentService.confirmCashPayment(codeToConfirm, organizerId);
      
      if (result.success) {
        toast({
          title: "Payment Confirmed!",
          description: "Cash payment has been confirmed and tickets have been generated.",
        });
        
        // Clear the input and reload pending payments
        setVerificationCode('');
        loadPendingPayments();
      } else {
        toast({
          title: "Confirmation Failed",
          description: result.error || "Failed to confirm cash payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BanknoteIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Cash Payment Dashboard</h1>
          <p className="text-muted-foreground">Confirm cash payments and issue tickets</p>
        </div>
      </div>

      {/* Quick Confirmation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Confirm Cash Payment</CardTitle>
          <CardDescription>
            Enter the verification code provided by the customer to confirm their cash payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                placeholder="Enter 8-character code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleConfirmPayment()}
                disabled={isConfirming || !verificationCode.trim()}
                className="px-8"
              >
                {isConfirming ? "Confirming..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only confirm payment after you have physically received the cash from the customer.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Pending Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Cash Payments</CardTitle>
          <CardDescription>
            Orders awaiting cash payment confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <ClockIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Loading pending payments...</p>
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-muted-foreground">No pending cash payments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className={`border rounded-lg p-4 ${
                    payment.isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{payment.customerName}</h3>
                        <Badge variant={payment.isExpired ? "destructive" : "default"}>
                          {payment.isExpired ? "Expired" : "Active"}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Email: {payment.customerEmail}</p>
                        <p>Event: {payment.eventTitle}</p>
                        <p>Amount: {formatCurrency(payment.totalAmount)}</p>
                        <p>Expires: {formatDateTime(payment.expiresAt)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Verification Code:</Label>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {payment.verificationCode}
                        </code>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {!payment.isExpired && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmPayment(payment.verificationCode)}
                          disabled={isConfirming}
                        >
                          Confirm Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}