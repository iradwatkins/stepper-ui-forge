import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react'

interface AnalyticsData {
  salesTrend: Array<{ date: string; sales: number; revenue: number }>
  topEvents: Array<{ name: string; tickets_sold: number; revenue: number }>
  salesByType: Array<{ type: string; count: number; percentage: number }>
  timeDistribution: Array<{ hour: number; sales: number }>
}

export default function TicketAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true)
      
      // TODO: Replace with actual API calls
      // const analyticsData = await AnalyticsService.getTicketAnalytics(user?.id, timeRange)
      
      // For now, initialize with empty data
      setAnalyticsData({
        salesTrend: [],
        topEvents: [],
        salesByType: [],
        timeDistribution: []
      })
      
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentStats = () => {
    if (!analyticsData) return null
    
    const totalSales = analyticsData.salesTrend.reduce((sum, day) => sum + day.sales, 0)
    const totalRevenue = analyticsData.salesTrend.reduce((sum, day) => sum + day.revenue, 0)
    const avgDailySales = Math.round(totalSales / analyticsData.salesTrend.length)
    const avgDailyRevenue = Math.round(totalRevenue / analyticsData.salesTrend.length)

    return { totalSales, totalRevenue, avgDailySales, avgDailyRevenue }
  }

  const stats = getCurrentStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Ticket Analytics</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Ticket Analytics</h1>
          <p className="text-muted-foreground">
            Track sales performance and identify trends
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalyticsData}>
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
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{stats.totalSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg {stats.avgDailySales}/day
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg ${stats.avgDailyRevenue}/day
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Ticket Price</p>
                  <p className="text-2xl font-bold">${Math.round(stats.totalRevenue / stats.totalSales)}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +5% from last period
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">12.3%</p>
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -2% from last period
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Sales Trends</TabsTrigger>
          <TabsTrigger value="events">Top Events</TabsTrigger>
          <TabsTrigger value="types">Ticket Types</TabsTrigger>
          <TabsTrigger value="timing">Sales Timing</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>
                Daily ticket sales and revenue over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.salesTrend.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{day.sales} tickets</div>
                      <div className="text-sm text-green-600">${day.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Events</CardTitle>
              <CardDescription>
                Events ranked by ticket sales and revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.topEvents.map((event, index) => (
                  <div key={event.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.tickets_sold} tickets sold
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">${event.revenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        ${Math.round(event.revenue / event.tickets_sold)} avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Ticket Type</CardTitle>
              <CardDescription>
                Breakdown of sales by different ticket categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.salesByType.map((type) => (
                  <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded bg-primary" style={{ opacity: type.percentage / 100 }}></div>
                      <div>
                        <div className="font-medium">{type.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.percentage}% of total
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{type.count.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">tickets</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Time of Day</CardTitle>
              <CardDescription>
                When customers are most likely to purchase tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {analyticsData?.timeDistribution.map((hour) => (
                  <div key={hour.hour} className="text-center p-2 border rounded">
                    <div className="text-xs text-muted-foreground">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-sm font-medium">{hour.sales}</div>
                    <div className="w-full bg-muted rounded-full h-1 mt-1">
                      <div 
                        className="bg-primary h-1 rounded-full" 
                        style={{ width: `${(hour.sales / 50) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}