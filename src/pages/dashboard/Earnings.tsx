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
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [stats, setStats] = useState<EarningsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('all')

  // Mock data for demonstration
  useEffect(() => {
    const loadEarningsData = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockStats: EarningsStats = {
        totalEarnings: 1245.75,
        pendingEarnings: 425.50,
        paidEarnings: 820.25,
        thisMonthEarnings: 325.75,
        nextPayoutAmount: 425.50,
        nextPayoutDate: '2024-02-01'
      }
      
      const mockEarnings: Earning[] = [
        {
          id: '1',
          type: 'commission',
          amount: 25.50,
          description: 'VIP Pass sales commission',
          eventTitle: 'Summer Music Festival',
          referralCode: 'SUMMER2024',
          date: '2024-01-15',
          status: 'pending'
        },
        {
          id: '2',
          type: 'commission',
          amount: 15.75,
          description: 'General Admission sales commission',
          eventTitle: 'Tech Conference 2024',
          referralCode: 'TECH50',
          date: '2024-01-14',
          status: 'pending'
        },
        {
          id: '3',
          type: 'bonus',
          amount: 50.00,
          description: 'Monthly sales bonus',
          eventTitle: 'Platform Bonus',
          date: '2024-01-01',
          status: 'paid',
          payoutDate: '2024-01-15'
        },
        {
          id: '4',
          type: 'commission',
          amount: 22.00,
          description: 'Tasting Pass sales commission',
          eventTitle: 'Food & Wine Expo',
          referralCode: 'FOODIE25',
          date: '2023-12-20',
          status: 'paid',
          payoutDate: '2024-01-01'
        }
      ]
      
      const mockPayouts: Payout[] = [
        {
          id: '1',
          amount: 275.50,
          method: 'bank_transfer',
          date: '2024-01-15',
          status: 'completed',
          reference: 'TXN-2024-001',
          earningsIncluded: 8
        },
        {
          id: '2',
          amount: 180.25,
          method: 'paypal',
          date: '2024-01-01',
          status: 'completed',
          reference: 'TXN-2023-012',
          earningsIncluded: 5
        },
        {
          id: '3',
          amount: 425.50,
          method: 'bank_transfer',
          date: '2024-02-01',
          status: 'pending',
          reference: 'TXN-2024-002',
          earningsIncluded: 12
        }
      ]
      
      setStats(mockStats)
      setEarnings(mockEarnings)
      setPayouts(mockPayouts)
      setIsLoading(false)
    }

    loadEarningsData()
  }, [selectedPeriod])

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
            <div className="text-2xl font-bold">${stats?.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +${stats?.thisMonthEarnings.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.pendingEarnings.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">${stats?.paidEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Successfully paid
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.nextPayoutAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.nextPayoutDate && new Date(stats.nextPayoutDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payout Alert */}
      {stats?.nextPayoutAmount && stats.nextPayoutAmount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Next Payout Scheduled</h3>
                <p className="text-sm text-muted-foreground">
                  ${stats.nextPayoutAmount.toFixed(2)} will be paid on {new Date(stats.nextPayoutDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Settings
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
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        <Badge className={getEarningTypeColor(earning.type)}>
                          {earning.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{earning.description}</TableCell>
                      <TableCell>{earning.eventTitle}</TableCell>
                      <TableCell>
                        {earning.referralCode && (
                          <code className="font-mono text-sm">{earning.referralCode}</code>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${earning.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(earning.date).toLocaleDateString()}
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
                  ))}
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
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <code className="font-mono text-sm">{payout.reference}</code>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          {getPaymentMethodName(payout.method)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payout.earningsIncluded} earnings
                      </TableCell>
                      <TableCell>
                        {new Date(payout.date).toLocaleDateString()}
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}