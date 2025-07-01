import React, { useState, useEffect } from 'react'
import { 
  Users, 
  UserCheck, 
  Clock, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Eye,
  Filter,
  Download,
  Search,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { TeamService, CheckInSession } from '@/lib/services/TeamService'
import { QRValidationService } from '@/lib/services/QRValidationService'

interface CheckinDashboardProps {
  eventId: string
}

interface CheckInStats {
  total_tickets: number
  checked_in: number
  pending: number
  check_in_rate: number
  hourly_stats: { hour: string, count: number }[]
  recent_checkins: any[]
}

interface LiveActivity {
  id: string
  type: 'check_in' | 'validation' | 'error'
  ticket_holder: string
  staff_member: string
  timestamp: string
  status: 'success' | 'failed' | 'duplicate'
  details?: any
}

export function CheckinDashboard({ eventId }: CheckinDashboardProps) {
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [activeSessions, setActiveSessions] = useState<CheckInSession[]>([])
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
      
      // Load team stats and active sessions
      const teamStatsResult = await TeamService.getTeamStats(eventId)
      
      if (teamStatsResult.success && teamStatsResult.data) {
        // Transform team stats into check-in stats format
        const mockStats: CheckInStats = {
          total_tickets: 250, // Would come from ticket service
          checked_in: teamStatsResult.data.recent_activity.check_ins_today || 0,
          pending: 250 - (teamStatsResult.data.recent_activity.check_ins_today || 0),
          check_in_rate: ((teamStatsResult.data.recent_activity.check_ins_today || 0) / 250) * 100,
          hourly_stats: generateMockHourlyStats(),
          recent_checkins: []
        }
        setStats(mockStats)
      }

      // Load recent activity (mock data for now)
      setLiveActivity(generateMockLiveActivity())
      
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('CheckinDashboard.loadDashboardData failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateMockHourlyStats = () => {
    const now = new Date()
    const hours = []
    for (let i = 6; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      hours.push({
        hour: hour.toLocaleTimeString([], { hour: '2-digit' }),
        count: Math.floor(Math.random() * 20) + 5
      })
    }
    return hours
  }

  const generateMockLiveActivity = (): LiveActivity[] => {
    const activities = []
    const now = new Date()
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - i * 2 * 60 * 1000) // 2 minutes apart
      activities.push({
        id: `activity_${i}`,
        type: Math.random() > 0.8 ? 'error' : 'check_in' as any,
        ticket_holder: `Attendee ${i + 1}`,
        staff_member: `Staff Member ${Math.floor(Math.random() * 3) + 1}`,
        timestamp: timestamp.toISOString(),
        status: Math.random() > 0.9 ? 'failed' : 'success' as any,
        details: {}
      })
    }
    
    return activities
  }

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'failed') return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (type === 'check_in') return <UserCheck className="w-4 h-4 text-green-500" />
    return <Activity className="w-4 h-4 text-blue-500" />
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200'
      case 'failed': return 'text-red-700 bg-red-50 border-red-200'
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
              <div className="flex items-center">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Total Tickets</span>
              </div>
              <div className="text-2xl font-bold">{stats.total_tickets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Checked In</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.checked_in}</div>
              <Progress value={stats.check_in_rate} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Pending</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 text-sm font-medium">Check-in Rate</span>
              </div>
              <div className="text-2xl font-bold">{stats.check_in_rate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live Activity</TabsTrigger>
          <TabsTrigger value="sessions">Staff Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                        <Badge variant={activity.status === 'success' ? 'default' : 'destructive'}>
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

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Staff Sessions</CardTitle>
              <CardDescription>
                Monitor active check-in sessions and staff activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active sessions</p>
                <p className="text-sm">Staff sessions will appear here when check-in starts</p>
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
                  Check-in volume over the last 7 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-2">
                    {stats.hourly_stats.map((stat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{stat.hour}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${(stat.count / 20) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{stat.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
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
      </Tabs>
    </div>
  )
}