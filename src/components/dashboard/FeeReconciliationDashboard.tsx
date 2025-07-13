import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  ClockIcon,
  InfoIcon,
  CheckCircleIcon 
} from "lucide-react";
import { FeeReconciliationService, FeeReconciliationSummary, ReconciliationTransaction } from "@/lib/services/FeeReconciliationService";

interface FeeReconciliationDashboardProps {
  organizerId: string;
}

export default function FeeReconciliationDashboard({ organizerId }: FeeReconciliationDashboardProps) {
  const [reconciliation, setReconciliation] = useState<FeeReconciliationSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<ReconciliationTransaction[]>([]);
  const [projectedNextDeduction, setProjectedNextDeduction] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReconciliationData();
  }, [organizerId]);

  const loadReconciliationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const report = await FeeReconciliationService.generateReconciliationReport(organizerId);
      
      setReconciliation(report.summary);
      setRecentTransactions(report.recentTransactions);
      setProjectedNextDeduction(report.projectedNextDeduction);

    } catch (err) {
      console.error('Failed to load reconciliation data:', err);
      setError('Failed to load fee reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'cash': 'secondary',
      'paypal': 'default',
      'square': 'outline',
      'cashapp': 'default'
    };
    
    return <Badge variant={variants[method] || 'outline'}>{method.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <ClockIcon className="w-8 h-8 animate-spin mr-2" />
            <span>Loading fee reconciliation data...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !reconciliation) {
    return (
      <Alert variant="destructive">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>{error || 'Failed to load fee reconciliation data'}</AlertDescription>
      </Alert>
    );
  }

  const hasOutstandingFees = reconciliation.netFeesOwed > 0.01;
  const reconciliationPercentage = reconciliation.totalCashFeesOwed > 0 
    ? Math.round((reconciliation.totalFeesDeducted / reconciliation.totalCashFeesOwed) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSignIcon className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold">Fee Reconciliation</h1>
          <p className="text-muted-foreground">Cash payment service fees and reconciliation status</p>
        </div>
      </div>

      {/* Status Alert */}
      {hasOutstandingFees ? (
        <Alert>
          <TrendingUpIcon className="h-4 w-4" />
          <AlertDescription>
            You have {formatCurrency(reconciliation.netFeesOwed)} in outstanding service fees from cash transactions. 
            These will be automatically deducted from future online payments.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            All service fees are up to date! No outstanding cash payment fees.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Fees Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(reconciliation.totalCashFeesOwed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From cash transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fees Deducted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(reconciliation.totalFeesDeducted)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From online payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hasOutstandingFees ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(reconciliation.netFeesOwed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Remaining to deduct</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(projectedNextDeduction)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated from next payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Progress */}
      {reconciliation.totalCashFeesOwed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Progress</CardTitle>
            <CardDescription>
              Progress towards reconciling all cash payment service fees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reconciled</span>
                <span>{reconciliationPercentage}%</span>
              </div>
              <Progress value={reconciliationPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Reconciled:</span>
                <span className="ml-2 font-medium">{formatCurrency(reconciliation.totalFeesDeducted)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining:</span>
                <span className="ml-2 font-medium">{formatCurrency(reconciliation.netFeesOwed)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your recent payment transactions and associated service fees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <InfoIcon className="w-8 h-8 mx-auto mb-2" />
              <p>No recent transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.orderId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Order #{transaction.orderId.slice(-8)}</span>
                      {getPaymentMethodBadge(transaction.paymentMethod)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(transaction.date)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      Fee: {formatCurrency(transaction.serviceFee)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Fee Reconciliation Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
            <div>
              <strong>Cash Transactions:</strong> When customers pay cash, a 3% service fee is tracked but not collected immediately.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
            <div>
              <strong>Online Payments:</strong> Service fees from cash transactions are automatically deducted from future online payments.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
            <div>
              <strong>Gradual Reconciliation:</strong> No more than 5% of any single online payment is used for fee reconciliation.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}