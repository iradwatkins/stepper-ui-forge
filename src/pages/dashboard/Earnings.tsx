import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { CommissionService, type CommissionEarning, type CommissionSummary } from '@/lib/services/CommissionService'
import { PayoutService, type PayoutRequest, type PayoutSummary } from '@/lib/services/PayoutService'

interface Earning {
  id: string
  type: 'commission' | 'bonus' | 'referral'
  amount: number
  description: string
  eventTitle: string
  referralCode?: string
  date: string
  status: 'pending' | 'processing' | 'paid'
  payoutDate?: string
}

interface Payout {
  id: string
  amount: number
  method: 'bank_transfer' | 'paypal' | 'stripe'
  date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  reference: string
  earningsIncluded: number
}

interface EarningsStats {
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  thisMonthEarnings: number
  nextPayoutAmount: number
  nextPayoutDate: string
}

export default function Earnings() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState<CommissionEarning[]>([])
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null)
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [error, setError] = useState<string | null>(null)

  // Load real earnings data
  useEffect(() => {
    const loadEarningsData = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // Load commission earnings, summary, and payout data in parallel
        const [
          earningsData,
          commissionSummaryData,
          payoutSummaryData,
          payoutHistoryData
        ] = await Promise.all([
          CommissionService.getFollowerEarnings(user.id),
          CommissionService.getFollowerCommissionSummary(user.id),
          PayoutService.getPayoutSummary(user.id),
          PayoutService.getPayoutHistory(user.id, 50, 0)
        ])
        
        setEarnings(earningsData)
        setCommissionSummary(commissionSummaryData)
        setPayoutSummary(payoutSummaryData)
        setPayouts(payoutHistoryData)
      } catch (error) {
        console.error('Error loading earnings data:', error)
        setError('Failed to load earnings data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadEarningsData()
  }, [user?.id, selectedPeriod])

  const getEarningTypeColor = (type: string) => {
    switch (type) {
      case 'commission':
        return 'bg-blue-100 text-blue-800'
      case 'bonus':
        return 'bg-green-100 text-green-800'
      case 'referral':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <ArrowUpRight className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'Bank Transfer'
      case 'paypal':
        return 'PayPal'
      case 'stripe':
        return 'Stripe'
      default:
        return method
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading earnings data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Data</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="mt-2 text-gray-600">
            Track your earnings and payout history
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${commissionSummary?.total_earnings.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {commissionSummary?.commission_count || 0} total earnings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${commissionSummary?.pending_amount.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payout
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payoutSummary?.total_paid.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Successfully paid
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payoutSummary?.available_balance.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {payoutSummary?.last_payout_date && `Last: ${new Date(payoutSummary.last_payout_date).toLocaleDateString()}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Balance Alert */}
      {payoutSummary?.available_balance && payoutSummary.available_balance > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Available for Payout</h3>
                <p className="text-sm text-muted-foreground">
                  ${payoutSummary.available_balance.toFixed(2)} ready to be requested
                  {payoutSummary.pending_requests > 0 && ` (${payoutSummary.pending_requests} requests pending)`}
                </p>
              </div>
            </div>
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Earnings and Payouts Tables */}
      <Tabs defaultValue="earnings" className="w-full">
        <TabsList>
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
              <CardDescription>
                Detailed breakdown of all your earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No earnings yet</p>
                          <p className="text-sm">Start selling tickets to earn commissions!</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    earnings.map((earning) => (
                      <TableRow key={earning.id}>
                        <TableCell>
                          <Badge className={getEarningTypeColor('commission')}>
                            commission
                          </Badge>
                        </TableCell>
                        <TableCell>Sales commission</TableCell>
                        <TableCell>{(earning as any).events?.title || 'Unknown Event'}</TableCell>
                        <TableCell>
                          {(earning as any).referral_codes?.code && (
                            <code className="font-mono text-sm">{(earning as any).referral_codes.code}</code>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${earning.commission_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(earning.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(earning.status)}
                            <Badge className={getStatusColor(earning.status)}>
                              {earning.status}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Track all your payout transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No payouts yet</p>
                          <p className="text-sm">Payouts will appear here once processed</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <code className="font-mono text-sm">PAY-{payout.id.slice(0, 8)}</code>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${payout.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {getPaymentMethodName(payout.payout_method)}
                          </div>
                        </TableCell>
                        <TableCell>
                          Multiple commissions
                        </TableCell>
                        <TableCell>
                          {new Date(payout.requested_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payout.status)}
                            <Badge className={getStatusColor(payout.status)}>
                              {payout.status}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}