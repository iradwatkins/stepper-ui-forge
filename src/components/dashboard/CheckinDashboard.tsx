import React, { useState, useEffect } from 'react'
import { 
  Users, 
  UserCheck, 
  Clock, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Eye,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CheckinDashboardProps {
  eventId: string
}

interface CheckInStats {
  total_tickets: number
  checked_in: number
  pending: number
  check_in_rate: number
  recent_checkins: Array<{
    id: string
    attendee_name: string
    staff_member: string
    timestamp: string
    status: 'success' | 'failed' | 'duplicate'
  }>
}

interface LiveActivity {
  id: string
  type: 'check_in' | 'validation' | 'error'
  ticket_holder: string
  staff_member: string
  timestamp: string
  status: 'success' | 'failed' | 'duplicate'
}

export function CheckinDashboard({ eventId }: CheckinDashboardProps) {
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadDashboardData()
    
    // Set up auto-refresh
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(loadDashboardData, 10000) // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [eventId, autoRefresh])

  const loadDashboardData = async () => {
    try {
      setError(null)
      
      // Mock data for development - replace with actual service calls
      const mockStats: CheckInStats = {
        total_tickets: 250,
        checked_in: 87,
        pending: 163,
        check_in_rate: 34.8,
        recent_checkins: []
      }

      const mockActivity: LiveActivity[] = generateMockLiveActivity()
      
      setStats(mockStats)
      setLiveActivity(mockActivity)
      
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('CheckinDashboard.loadDashboardData failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateMockLiveActivity = (): LiveActivity[] => {
    const activities = []
    const now = new Date()
    const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Chris Brown']
    const staff = ['Alex (Staff)', 'Jordan (Staff)', 'Taylor (Staff)']
    
    for (let i = 0; i < 15; i++) {
      const timestamp = new Date(now.getTime() - i * 2 * 60 * 1000) // 2 minutes apart
      activities.push({
        id: `activity_${i}`,
        type: Math.random() > 0.8 ? 'error' : 'check_in',
        ticket_holder: names[Math.floor(Math.random() * names.length)],
        staff_member: staff[Math.floor(Math.random() * staff.length)],
        timestamp: timestamp.toISOString(),
        status: Math.random() > 0.9 ? 'failed' : Math.random() > 0.95 ? 'duplicate' : 'success'
      })
    }
    
    return activities
  }

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'failed') return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (status === 'duplicate') return <AlertTriangle className="w-4 h-4 text-orange-500" />
    if (type === 'check_in') return <UserCheck className="w-4 h-4 text-green-500" />
    return <Activity className="w-4 h-4 text-blue-500" />
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200'
      case 'failed': return 'text-red-700 bg-red-50 border-red-200'
      case 'duplicate': return 'text-orange-700 bg-orange-50 border-orange-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const filteredActivity = liveActivity.filter(activity => {
    const matchesSearch = activity.ticket_holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.staff_member.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || activity.status === filterStatus
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Check-in Dashboard</h2>
            <p className="text-muted-foreground">Real-time check-in monitoring</p>
          </div>
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
          <h2 className="text-2xl font-bold tracking-tight">Check-in Dashboard</h2>
          <p className="text-muted-foreground">Real-time check-in monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-bold">{stats.total_tickets}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Checked In</p>
                  <p className="text-2xl font-bold text-green-600">{stats.checked_in}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
              <Progress value={stats.check_in_rate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{stats.check_in_rate.toFixed(1)}% of total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Check-in Rate</p>
                  <p className="text-2xl font-bold">{stats.check_in_rate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Check-in Activity</CardTitle>
                  <CardDescription>
                    Real-time check-in events and validations
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="duplicate">Duplicate</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search activity..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity found</p>
                  </div>
                ) : (
                  filteredActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getActivityColor(activity.status)}`}
                    >
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(activity.type, activity.status)}
                        <div>
                          <div className="font-medium">{activity.ticket_holder}</div>
                          <div className="text-sm opacity-75">
                            by {activity.staff_member} • {formatTime(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            activity.status === 'success' ? 'default' : 
                            activity.status === 'duplicate' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {activity.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hourly Check-ins</CardTitle>
                <CardDescription>
                  Check-in volume over the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 8 }, (_, i) => {
                    const hour = new Date(Date.now() - i * 3600000).getHours()
                    const count = Math.floor(Math.random() * 25) + 5
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{hour}:00</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${(count / 30) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Metrics</CardTitle>
                <CardDescription>
                  Key check-in performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Check-in Time</span>
                    <span className="text-sm font-bold">2.3s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm font-bold text-green-600">98.7%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Duplicate Attempts</span>
                    <span className="text-sm font-bold text-orange-600">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network Errors</span>
                    <span className="text-sm font-bold text-red-600">1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>
                Individual staff member check-in performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Alex Johnson', 'Jordan Smith', 'Taylor Brown'].map((staff, index) => (
                  <div key={staff} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{staff}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.floor(Math.random() * 50) + 20} scans today
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{98 + index}% success rate</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 3)} errors
                      </div>
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