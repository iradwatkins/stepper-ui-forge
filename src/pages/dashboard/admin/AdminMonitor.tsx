import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Monitor, 
  Server, 
  Database, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
  Zap
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  SystemMonitoringService, 
  type SystemMetric as ServiceMetric,
  type ServiceStatus as ServiceStatusType,
  type ActivityLog 
} from '@/lib/services/SystemMonitoringService'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PerformanceAudit } from '@/components/admin/PerformanceAudit'

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Database,
  HardDrive,
  Wifi,
  Clock,
  Cpu
}

interface SystemMetric extends ServiceMetric {
  icon: React.ComponentType<{ className?: string }>
}

interface ServiceStatus extends ServiceStatusType {}

export default function AdminMonitor() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)
  const [performanceScore, setPerformanceScore] = useState<number>(0)

  useEffect(() => {
    // Start performance monitoring
    SystemMonitoringService.startPerformanceMonitoring()
    
    loadSystemData()
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemData, 30000) // Refresh every 30 seconds
      return () => {
        clearInterval(interval)
        SystemMonitoringService.stopPerformanceMonitoring()
      }
    }

    return () => {
      SystemMonitoringService.stopPerformanceMonitoring()
    }
  }, [autoRefresh])

  const loadSystemData = async () => {
    setLoading(true)
    try {
      // Fetch real metrics
      const [metricsData, servicesData, logsData, perfAnalysis] = await Promise.all([
        SystemMonitoringService.getSystemMetrics(),
        SystemMonitoringService.getServiceStatuses(),
        SystemMonitoringService.getActivityLogs(),
        SystemMonitoringService.analyzePerformance()
      ])

      // Map metrics with icon components
      const mappedMetrics = metricsData.map(metric => ({
        ...metric,
        icon: iconMap[metric.icon] || Activity
      }))

      setMetrics(mappedMetrics)
      setServices(servicesData)
      setActivityLogs(logsData)
      setPerformanceScore(perfAnalysis.scores.overall || 0)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading system data:', error)
      toast.error('Failed to load monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = async () => {
    try {
      const detailedMetrics = await SystemMonitoringService.getDetailedMetrics()
      const perfAnalysis = await SystemMonitoringService.analyzePerformance()
      
      const report = {
        timestamp: new Date().toISOString(),
        metrics,
        services,
        activityLogs,
        performance: perfAnalysis,
        resources: detailedMetrics
      }

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-monitor-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('System report exported successfully')
    } catch (error) {
      console.error('Error exporting logs:', error)
      toast.error('Failed to export system report')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600'
      case 'warning':
      case 'degraded':
        return 'text-yellow-600'
      case 'critical':
      case 'offline':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'warning':
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'critical':
      case 'offline':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const overallHealth = () => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length
    const warningCount = metrics.filter(m => m.status === 'warning').length
    
    if (criticalCount > 0) return 'critical'
    if (warningCount > 0) return 'warning'
    return 'healthy'
  }

  const getOverallScore = () => {
    if (performanceScore >= 90) return { status: 'healthy', label: 'Excellent' }
    if (performanceScore >= 70) return { status: 'warning', label: 'Good' }
    if (performanceScore >= 50) return { status: 'warning', label: 'Needs Improvement' }
    return { status: 'critical', label: 'Poor' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitor</h1>
          <p className="text-muted-foreground">Real-time system health and performance monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSystemData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
          <TabsTrigger value="performance">Performance Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${getStatusColor(overallHealth())}`}>
                {overallHealth() === 'healthy' ? 'Operational' : overallHealth() === 'warning' ? 'Degraded' : 'Critical'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{metrics.length} metrics monitored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${getStatusColor(getOverallScore().status)}`}>
                {performanceScore}%
              </div>
              <Badge className={`${
                getOverallScore().status === 'healthy' ? 'bg-green-100 text-green-800' :
                getOverallScore().status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getOverallScore().label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Website speed score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Online</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {services.filter(s => s.status === 'online').length}/{services.length}
            </div>
            <p className="text-xs text-muted-foreground">All critical services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastUpdated.toLocaleTimeString()}</div>
            <p className="text-xs text-muted-foreground">Auto-refresh: {autoRefresh ? 'On' : 'Off'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {metrics.some(m => m.status === 'warning' || m.status === 'critical') && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System monitoring has detected some issues that require attention. Check the metrics below for details.
          </AlertDescription>
        </Alert>
      )}

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
          <CardDescription>Real-time performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <metric.icon className={`h-5 w-5 ${getStatusColor(metric.status)}`} />
                  <div>
                    <p className="font-medium">{metric.name}</p>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getStatusColor(metric.status)}`}>
                    {metric.value}
                  </p>
                  {getStatusBadge(metric.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Status of critical platform services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'online' ? 'bg-green-500' :
                    service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last checked: {service.lastCheck}
                      {service.responseTime && ` • Response: ${service.responseTime}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {service.status === 'online' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : service.status === 'degraded' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-medium ${getStatusColor(service.status)}`}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Uptime: {service.uptime}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>System events and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityLogs.length > 0 ? (
              activityLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    log.type === 'success' ? 'bg-green-500' :
                    log.type === 'warning' ? 'bg-yellow-500' :
                    log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.event}</p>
                    <p className="text-xs text-muted-foreground">{log.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {loading ? 'Loading activity logs...' : 'No recent activity'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceAudit />
        </TabsContent>
      </Tabs>
    </div>
  )
}