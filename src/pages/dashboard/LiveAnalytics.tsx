import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RealTimeAnalyticsDashboard } from '@/components/dashboard/RealTimeAnalyticsDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertTriangle, 
  Activity, 
  Shield, 
  TrendingUp, 
  Bell,
  BellOff,
  Maximize,
  Minimize
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LiveAnalytics() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || 'demo-event-123'
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [alertCount, setAlertCount] = useState(1)

  const handleDuplicateAlert = (alertId: string) => {
    setAlertCount(prev => prev + 1)
  }

  const mockEventData = {
    name: 'Demo Event',
    date: new Date().toLocaleDateString(),
    status: 'active'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Analytics</h1>
          <p className="text-muted-foreground">
            Real-time monitoring, security alerts, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setAlertsEnabled(!alertsEnabled)}
          >
            {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            Alerts {alertsEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {fullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
          <Link to="/dashboard/checkin">
            <Button>
              <Activity className="w-4 h-4 mr-2" />
              Check-in Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Event Status */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Monitoring analytics for:</div>
            <div className="font-medium">{mockEventData.name} (ID: {eventId})</div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
            {alertCount > 0 && (
              <Badge variant="destructive">
                {alertCount} Alert{alertCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Alert Status */}
      {!alertsEnabled && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <BellOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Security alerts are disabled. Enable alerts to receive real-time notifications about duplicate tickets and suspicious activity.
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Full Dashboard</TabsTrigger>
          <TabsTrigger value="compact">Compact View</TabsTrigger>
          <TabsTrigger value="security">Security Focus</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <RealTimeAnalyticsDashboard 
            eventId={eventId}
            onDuplicateAlert={handleDuplicateAlert}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="compact" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RealTimeAnalyticsDashboard 
              eventId={eventId}
              onDuplicateAlert={handleDuplicateAlert}
              compact={true}
            />
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alert Status</p>
                    <p className="text-2xl font-bold text-green-600">
                      {alertsEnabled ? 'Active' : 'Disabled'}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Performance</p>
                    <p className="text-2xl font-bold text-blue-600">Excellent</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Security-focused view shows only duplicate detection, fraud patterns, and suspicious activity monitoring.
            </AlertDescription>
          </Alert>
          
          {/* Security-focused analytics would go here */}
          <RealTimeAnalyticsDashboard 
            eventId={eventId}
            onDuplicateAlert={handleDuplicateAlert}
            compact={false}
          />
        </TabsContent>
      </Tabs>

      {/* Development Note */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Development Note: This page showcases the RealTimeAnalyticsDashboard component with different view modes. 
          Real-time data would be fetched via WebSocket connections in production. 
          Alert count: {alertCount}
        </AlertDescription>
      </Alert>
    </div>
  )
}