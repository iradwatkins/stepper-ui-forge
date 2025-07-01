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
  Wifi
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SystemMetric {
  name: string
  value: string | number
  status: 'healthy' | 'warning' | 'critical'
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  uptime: string
  lastCheck: string
  responseTime?: string
}

export default function AdminMonitor() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadSystemData()
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadSystemData = () => {
    // Mock system metrics
    const mockMetrics: SystemMetric[] = [
      {
        name: 'CPU Usage',
        value: '23%',
        status: 'healthy',
        icon: Cpu,
        description: 'Current CPU utilization'
      },
      {
        name: 'Memory Usage',
        value: '67%',
        status: 'warning',
        icon: HardDrive,
        description: 'RAM utilization'
      },
      {
        name: 'Disk Space',
        value: '45%',
        status: 'healthy',
        icon: Database,
        description: 'Storage usage'
      },
      {
        name: 'Network I/O',
        value: '1.2 MB/s',
        status: 'healthy',
        icon: Wifi,
        description: 'Network throughput'
      },
      {
        name: 'Active Users',
        value: 1247,
        status: 'healthy',
        icon: Activity,
        description: 'Currently online users'
      },
      {
        name: 'Database Connections',
        value: 23,
        status: 'healthy',
        icon: Database,
        description: 'Active DB connections'
      }
    ]

    // Mock service statuses
    const mockServices: ServiceStatus[] = [
      {
        name: 'Web Server',
        status: 'online',
        uptime: '99.98%',
        lastCheck: '30 seconds ago',
        responseTime: '142ms'
      },
      {
        name: 'Database',
        status: 'online',
        uptime: '99.95%',
        lastCheck: '30 seconds ago',
        responseTime: '8ms'
      },
      {
        name: 'Payment Gateway',
        status: 'online',
        uptime: '99.99%',
        lastCheck: '1 minute ago',
        responseTime: '234ms'
      },
      {
        name: 'Email Service',
        status: 'degraded',
        uptime: '98.5%',
        lastCheck: '2 minutes ago',
        responseTime: '1.2s'
      },
      {
        name: 'File Storage',
        status: 'online',
        uptime: '99.97%',
        lastCheck: '45 seconds ago',
        responseTime: '89ms'
      },
      {
        name: 'Analytics Service',
        status: 'online',
        uptime: '99.92%',
        lastCheck: '1 minute ago',
        responseTime: '456ms'
      }
    ]

    setMetrics(mockMetrics)
    setServices(mockServices)
    setLastUpdated(new Date())
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitor</h1>
          <p className="text-muted-foreground">Real-time system health and performance monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSystemData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${getStatusColor(overallHealth())}`}>
                {overallHealth() === 'healthy' ? '98%' : overallHealth() === 'warning' ? '85%' : '45%'}
              </div>
              {getStatusBadge(overallHealth())}
            </div>
            <p className="text-xs text-muted-foreground">Overall system performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.8%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
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
            {[
              { time: '2 minutes ago', event: 'Database backup completed successfully', type: 'info' },
              { time: '15 minutes ago', event: 'High memory usage detected on server-02', type: 'warning' },
              { time: '1 hour ago', event: 'Email service experiencing delays', type: 'warning' },
              { time: '2 hours ago', event: 'Security scan completed - no issues found', type: 'success' },
              { time: '4 hours ago', event: 'System update applied successfully', type: 'info' }
            ].map((log, index) => (
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}