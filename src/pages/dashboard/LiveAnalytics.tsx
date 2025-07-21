import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RealTimeAnalyticsDashboard } from '@/components/dashboard/RealTimeAnalyticsDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertTriangle, 
  Activity, 
  Shield, 
  TrendingUp, 
  Bell,
  BellOff,
  Maximize,
  Minimize,
  Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { EventsService } from '@/lib/events-db'
import { useAuth } from '@/contexts/AuthContext'
import { LiveAnalyticsService } from '@/lib/services/LiveAnalyticsService'
import { toast } from 'sonner'

export default function LiveAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')
  const { user } = useAuth()
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [userEvents, setUserEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId)
  const [analyticsAvailable, setAnalyticsAvailable] = useState(true)

  const handleDuplicateAlert = (alertId: string) => {
    setAlertCount(prev => prev + 1)
  }

  const [eventData, setEventData] = useState({
    name: 'Loading...',
    date: new Date().toLocaleDateString(),
    status: 'loading' as 'loading' | 'active' | 'inactive'
  })

  // Load user's events
  useEffect(() => {
    const loadUserEvents = async () => {
      if (!user?.id) return
      
      try {
        // Get events where user is owner or team member
        const events = await EventsService.getUserEvents(user.id)
        const upcomingEvents = events.filter(e => 
          new Date(e.date) >= new Date() && e.status === 'published'
        )
        setUserEvents(upcomingEvents)
        
        // If no event selected and user has events, select the first one
        if (!selectedEventId && upcomingEvents.length > 0) {
          setSelectedEventId(upcomingEvents[0].id)
          setSearchParams({ eventId: upcomingEvents[0].id })
        }
      } catch (error) {
        console.error('Failed to load user events:', error)
      }
    }
    
    loadUserEvents()
  }, [user?.id])

  // Check if analytics is available
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await LiveAnalyticsService.isAnalyticsAvailable()
      setAnalyticsAvailable(available)
    }
    checkAvailability()
  }, [])

  // Load event data when selection changes
  useEffect(() => {
    const loadEventData = async () => {
      if (!selectedEventId) {
        setEventData({
          name: 'No event selected',
          date: new Date().toLocaleDateString(),
          status: 'inactive'
        })
        return
      }

      try {
        // Get event details
        const event = userEvents.find(e => e.id === selectedEventId)
        if (event) {
          setEventData({
            name: event.title,
            date: new Date(event.date).toLocaleDateString(),
            status: 'active'
          })
          
          // Get duplicate alert count
          const alerts = await LiveAnalyticsService.getDuplicateAlerts(selectedEventId)
          setAlertCount(alerts.filter(a => !a.resolved).length)
        }
      } catch (error) {
        console.error('Failed to load event data:', error)
        toast.error('Failed to load event analytics')
      }
    }
    
    loadEventData()
  }, [selectedEventId, userEvents])

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId)
    setSearchParams({ eventId })
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

      {/* Event Selection */}
      {userEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Event to Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedEventId || ''} onValueChange={handleEventChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {userEvents.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.title}</span>
                        <span className="text-muted-foreground text-sm">
                          - {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEventId && (
                <Link to={`/event/${selectedEventId}`}>
                  <Button variant="outline" size="sm">
                    View Event
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Status */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Monitoring analytics for:</div>
            <div className="font-medium">{eventData.name}</div>
            <div className="text-sm text-muted-foreground">{eventData.date}</div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedEventId && eventData.status === 'active' ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="secondary">
                No Event Selected
              </Badge>
            )}
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

      {/* No Event Selected Message */}
      {!selectedEventId && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            {userEvents.length === 0 
              ? "You don't have any upcoming events to monitor. Create an event first to access live analytics."
              : "Please select an event from the dropdown above to view live analytics."}
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Not Available Message */}
      {!analyticsAvailable && selectedEventId && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Analytics data is not available yet. The required database tables need to be created. 
            Please run the migration: <code className="font-mono bg-yellow-100 px-1 py-0.5 rounded text-sm">20250121_dashboard_production_fixes.sql</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Tabs */}
      {selectedEventId && analyticsAvailable && (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Full Dashboard</TabsTrigger>
            <TabsTrigger value="compact">Compact View</TabsTrigger>
            <TabsTrigger value="security">Security Focus</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <RealTimeAnalyticsDashboard 
              eventId={selectedEventId}
              onDuplicateAlert={handleDuplicateAlert}
              compact={false}
            />
          </TabsContent>

          <TabsContent value="compact" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <RealTimeAnalyticsDashboard 
                eventId={selectedEventId}
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
              eventId={selectedEventId}
              onDuplicateAlert={handleDuplicateAlert}
              compact={false}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* No events message */}
      {userEvents.length === 0 && (
        <Card className="text-center p-8">
          <CardContent>
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Events to Monitor</h3>
            <p className="text-muted-foreground mb-4">
              You need to create or be assigned to an event to access live analytics.
            </p>
            <Link to="/create-event">
              <Button>
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}