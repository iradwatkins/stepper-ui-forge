import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Search,
  Filter,
  Eye
} from 'lucide-react'

interface PaymentData {
  id: string
  transactionId: string
  eventTitle: string
  customerName: string
  customerEmail: string
  amount: number
  fees: number
  netAmount: number
  paymentMethod: 'paypal' | 'square' | 'cash_app' | 'cash'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  createdAt: string
  processedAt?: string
}

interface PaymentStats {
  totalRevenue: number
  totalFees: number
  netRevenue: number
  transactionCount: number
  pendingAmount: number
  refundedAmount: number
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  useEffect(() => {
    loadPaymentData()
  }, [])

  const loadPaymentData = async () => {
    try {
      setIsLoading(true)
      // Mock data - replace with actual service call
      const mockPayments: PaymentData[] = [
        {
          id: 'pay-1',
          transactionId: 'txn_1A2B3C4D',
          eventTitle: 'Summer Music Festival',
          customerName: 'John Smith',
          customerEmail: 'john.smith@demo.local',
          amount: 90.00,
          fees: 3.60,
          netAmount: 86.40,
          paymentMethod: 'paypal',
          status: 'completed',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          processedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'pay-2',
          transactionId: 'txn_5E6F7G8H',
          eventTitle: 'Tech Conference 2024',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah@demo.local',
          amount: 199.00,
          fees: 7.96,
          netAmount: 191.04,
          paymentMethod: 'square',
          status: 'completed',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          processedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'pay-3',
          transactionId: 'txn_9I0J1K2L',
          eventTitle: 'Art Gallery Opening',
          customerName: 'Mike Davis',
          customerEmail: 'mike@demo.local',
          amount: 25.00,
          fees: 1.00,
          netAmount: 24.00,
          paymentMethod: 'cash',
          status: 'pending',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'pay-4',
          transactionId: 'txn_3M4N5O6P',
          eventTitle: 'Summer Music Festival',
          customerName: 'Emily Wilson',
          customerEmail: 'emily@demo.local',
          amount: 45.00,
          fees: 1.80,
          netAmount: 43.20,
          paymentMethod: 'cash_app',
          status: 'failed',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      ]

      const mockStats: PaymentStats = {
        totalRevenue: mockPayments.reduce((sum, p) => sum + p.amount, 0),
        totalFees: mockPayments.reduce((sum, p) => sum + p.fees, 0),
        netRevenue: mockPayments.reduce((sum, p) => sum + p.netAmount, 0),
        transactionCount: mockPayments.length,
        pendingAmount: mockPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
        refundedAmount: mockPayments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0)
      }

      setPayments(mockPayments)
      setPaymentStats(mockStats)
    } catch (error) {
      console.error('Error loading payment data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'refunded': return <RefreshCw className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'paypal': return 'bg-blue-100 text-blue-800'
      case 'square': return 'bg-gray-100 text-gray-800'
      case 'cash_app': return 'bg-green-100 text-green-800'
      case 'cash': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter
    return matchesSearch && matchesStatus && matchesMethod
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Payment Management</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-muted-foreground">
            Monitor transactions, track revenue, and manage payment processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadPaymentData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {paymentStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${paymentStats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${paymentStats.netRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">After fees</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processing Fees</p>
                  <p className="text-2xl font-bold text-red-600">${paymentStats.totalFees.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((paymentStats.totalFees / paymentStats.totalRevenue) * 100).toFixed(1)}% of revenue
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{paymentStats.transactionCount}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(paymentStats.totalRevenue / paymentStats.transactionCount).toFixed(2)} avg
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="square">Square</SelectItem>
            <SelectItem value="cash_app">Cash App</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-mono text-sm">{payment.transactionId}</div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{payment.customerName}</div>
                    <div className="text-sm text-muted-foreground">{payment.customerEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{payment.eventTitle}</div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">${payment.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      Net: ${payment.netAmount.toFixed(2)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getMethodColor(payment.paymentMethod)}>
                    {payment.paymentMethod.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(payment.status)}
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(payment.createdAt).toLocaleDateString()}
                  <div className="text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}