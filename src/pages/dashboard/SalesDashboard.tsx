import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CommissionService } from '@/lib/services/CommissionService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  BarChart3
} from 'lucide-react'

interface Sale {
  id: string
  eventTitle: string
  ticketType: string
  quantity: number
  unitPrice: number
  commission: number
  total: number
  purchaserName: string
  purchaseDate: string
  referralCode: string
  status: 'completed' | 'pending' | 'refunded'
}

interface SalesStats {
  totalEarnings: number
  totalSales: number
  monthlyEarnings: number
  commissionsEarned: number
  averageCommissionRate: number
  topEvent: string
}

export default function SalesDashboard() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  // Load sales data from API
  useEffect(() => {
    const loadSalesData = async () => {
      setIsLoading(true)
      
      try {
        // TODO: Replace with actual API calls
        // const salesData = await CommissionService.getUserSales(user?.id, selectedPeriod)
        // const salesStats = await CommissionService.getUserSalesStats(user?.id, selectedPeriod)
        
        // For now, initialize with empty data
        setStats({
          totalEarnings: 0,
          totalSales: 0,
          monthlyEarnings: 0,
          commissionsEarned: 0,
          averageCommissionRate: 0,
          topEvent: ''
        })
        setSales([])
        
      } catch (error) {
        console.error('Error loading sales data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSalesData()
  }, [selectedPeriod, user?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'refunded':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSales = sales.filter(sale =>
    sale.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.purchaserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading sales data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Track your ticket sales and commission earnings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Analytics
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
              +${stats?.monthlyEarnings.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Tickets sold via referrals
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.commissionsEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average {stats?.averageCommissionRate}% rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Event</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary">{stats?.topEvent}</div>
            <p className="text-xs text-muted-foreground">
              Best performing event
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                Your latest ticket sales and commission details
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search sales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Sales ({sales.length})</TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({sales.filter(s => s.status === 'completed').length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({sales.filter(s => s.status === 'pending').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Purchaser</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">{sale.eventTitle}</div>
                        <div className="text-sm text-gray-500">Code: {sale.referralCode}</div>
                      </TableCell>
                      <TableCell>{sale.ticketType}</TableCell>
                      <TableCell>{sale.purchaserName}</TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell>${sale.total.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${sale.commission.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(sale.purchaseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(sale.status)}>
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}