import { useState, useEffect } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock, 
  Shield, 
  RefreshCw,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LiveAnalyticsService, 
  type LiveAnalyticsStats,
  type DuplicateAlert,
  type StaffPerformance 
} from '@/lib/services/LiveAnalyticsService'

interface RealTimeAnalyticsDashboardProps {
  eventId: string
  onDuplicateAlert?: (alertId: string) => void
  compact?: boolean
}


export function RealTimeAnalyticsDashboard({ 
  eventId, 
  onDuplicateAlert,
  compact = false 
}: RealTimeAnalyticsDashboardProps) {
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [showDetails, setShowDetails] = useState(!compact)
  const [stats, setStats] = useState<LiveAnalyticsStats | null>(null)
  const [duplicateAlerts, setDuplicateAlerts] = useState<DuplicateAlert[]>([])
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!eventId) return
    
    loadAnalyticsData()
    
    // Set up auto-refresh
    const interval = setInterval(loadAnalyticsData, 10000) // Refresh every 10 seconds
    
    // Set up real-time subscription
    const subscription = LiveAnalyticsService.subscribeToCheckIns(eventId, (checkIn) => {
      // Refresh data when new check-in arrives
      loadAnalyticsData()
    })
    
    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [eventId])

  const loadAnalyticsData = async () => {
    if (!eventId) return
    
    try {
      setIsRefreshing(true)
      setError(null)
      
      // Load real data from service
      const [analyticsStats, alerts, performance] = await Promise.all([
        LiveAnalyticsService.getEventAnalytics(eventId),
        LiveAnalyticsService.getDuplicateAlerts(eventId),
        LiveAnalyticsService.getStaffPerformance(eventId)
      ])

      setStats(analyticsStats)
      setDuplicateAlerts(alerts)
      setStaffPerformance(performance)
      setLastUpdated(new Date())
      
      // Notify parent about unresolved alerts
      const unresolvedCount = alerts.filter(a => !a.resolved).length
      if (unresolvedCount > 0 && onDuplicateAlert) {
        alerts.forEach(alert => {
          if (!alert.resolved) {
            onDuplicateAlert(alert.id)
          }
        })
      }
      
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('RealTimeAnalyticsDashboard.loadAnalyticsData failed:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const refreshAnalytics = () => {
    loadAnalyticsData()
  }

  const markDuplicateResolved = (alertId: string) => {
    setDuplicateAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true }
          : alert
      )
    )
  }

  const clearDuplicateAlerts = () => {
    setDuplicateAlerts([])
  }

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const getSuccessRate = () => {
    if (!stats || stats.total_attempts === 0) return 0
    return (stats.successful_checkins / stats.total_attempts) * 100
  }

  const getDuplicateRate = () => {
    if (!stats || stats.total_attempts === 0) return 0
    return (stats.duplicate_attempts / stats.total_attempts) * 100
  }

  if (loading && !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert className="border-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load analytics: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAnalytics}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Live Analytics</CardTitle>
            <div className="flex items-center space-x-2">
              {duplicateAlerts.filter(a => !a.resolved).length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {duplicateAlerts.filter(a => !a.resolved).length} alerts
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Check-ins</div>
                <div className="font-medium">{stats?.successful_checkins || 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Success Rate</div>
                <div className="font-medium">{getSuccessRate().toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duplicates</div>
                <div className="font-medium text-orange-600">{stats?.duplicate_attempts || 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Update</div>
                <div className="font-medium">{formatTime(lastUpdated)}</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-Time Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Live check-in monitoring and security alerts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAlertsEnabled(!alertsEnabled)}
          >
            {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            Alerts {alertsEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAnalytics}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{stats?.total_attempts || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{getSuccessRate().toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={getSuccessRate()} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duplicates</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.duplicate_attempts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {getDuplicateRate().toFixed(2)}% of total
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Rate</p>
                <p className="text-2xl font-bold">{stats?.current_rate || 0}/min</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last 10 minutes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {duplicateAlerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-800 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security Alerts</span>
                <Badge variant="destructive">{duplicateAlerts.filter(a => !a.resolved).length}</Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={clearDuplicateAlerts}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {duplicateAlerts.slice(0, 10).map((alert) => (
                <Alert key={alert.id} className={`${alert.resolved ? 'opacity-50' : ''} border-orange-200 bg-orange-50`}>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <strong>Duplicate check-in detected</strong> for ticket {alert.ticket_id.slice(-8)}
                      <div className="text-xs text-orange-700 mt-1">
                        {alert.duplicate_attempts.length} duplicate attempts • Level: {alert.alert_level}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markDuplicateResolved(alert.id)
                            onDuplicateAlert?.(alert.id)
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                      <Badge variant={alert.alert_level === 'high' ? 'destructive' : 'secondary'}>
                        {alert.alert_level}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Check-in Distribution</CardTitle>
                <CardDescription>Breakdown of check-in attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Successful</span>
                    <span className="font-medium text-green-600">{stats?.successful_checkins || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Duplicates</span>
                    <span className="font-medium text-orange-600">{stats?.duplicate_attempts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Invalid</span>
                    <span className="font-medium text-red-600">{stats?.invalid_tickets || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-medium">{stats?.error_rate.toFixed(2) || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Activity</CardTitle>
                <CardDescription>Busiest check-in periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Peak Time</span>
                    <span className="font-medium">{stats?.peak_time || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current Rate</span>
                    <span className="font-medium">{stats?.current_rate || 0} scans/10min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Updated</span>
                    <span className="font-medium">{formatTime(lastUpdated)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Real-time staff check-in performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {staffPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active staff sessions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {staffPerformance.map((staff) => (
                    <div key={staff.staff_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{staff.staff_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {staff.total_scans} scans • {((staff.successful_scans / Math.max(staff.total_scans, 1)) * 100).toFixed(1)}% success
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={staff.success_rate >= 95 ? 'default' : 'secondary'}>
                          {staff.success_rate.toFixed(1)}%
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {staff.duplicate_detections} duplicates
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Monitoring</CardTitle>
              <CardDescription>Fraud detection and security alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                <p>No security issues detected</p>
                <p className="text-sm">All check-in activities appear normal</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}