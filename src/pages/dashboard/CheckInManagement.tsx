import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckinDashboard } from '@/components/dashboard/CheckinDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Smartphone, QrCode, Users, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TeamService } from '@/lib/services/TeamService'
import { supabase } from '@/integrations/supabase/client'
import { EventsService } from '@/lib/events-db'

export default function CheckInManagement() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')
  const [qrScannerActive, setQrScannerActive] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeStaff: 0,
    totalCheckins: 0,
    lastCheckinTime: '',
    duplicateAttempts: 0,
    totalTickets: 0,
    checkinPercentage: 0
  })

  // Load real check-in stats
  useEffect(() => {
    if (!eventId) return
    
    const loadEventAndStats = async () => {
      setLoading(true)
      try {
        // Load event details
        const eventData = await EventsService.getEvent(eventId)
        setEvent(eventData)
        
        // Load check-in statistics
        const [ticketStats, activeStaffCount] = await Promise.all([
          loadTicketStats(eventId),
          loadActiveStaff(eventId)
        ])
        
        setStats({
          activeStaff: activeStaffCount,
          totalCheckins: ticketStats.checkedIn,
          lastCheckinTime: ticketStats.lastCheckinTime,
          duplicateAttempts: ticketStats.duplicateAttempts,
          totalTickets: ticketStats.total,
          checkinPercentage: ticketStats.total > 0 ? Math.round((ticketStats.checkedIn / ticketStats.total) * 100) : 0
        })
      } catch (error) {
        console.error('Error loading check-in data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEventAndStats()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadEventAndStats, 30000)
    return () => clearInterval(interval)
  }, [eventId])

  const loadTicketStats = async (eventId: string) => {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          status,
          checked_in_at,
          ticket_types!inner(event_id)
        `)
        .eq('ticket_types.event_id', eventId)

      if (error) throw error

      const total = tickets?.length || 0
      const checkedIn = tickets?.filter(t => t.status === 'used').length || 0
      
      // Find most recent check-in
      const recentCheckins = tickets
        ?.filter(t => t.checked_in_at)
        .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
      
      const lastCheckinTime = recentCheckins?.[0]?.checked_in_at 
        ? new Date(recentCheckins[0].checked_in_at).toLocaleString()
        : 'No recent activity'

      // Count duplicate attempts (for demo purposes, using a simple heuristic)
      const duplicateAttempts = 0 // Would need to track this in actual check-in attempts

      return {
        total,
        checkedIn,
        lastCheckinTime,
        duplicateAttempts
      }
    } catch (error) {
      console.error('Error loading ticket stats:', error)
      return {
        total: 0,
        checkedIn: 0,
        lastCheckinTime: 'Error loading data',
        duplicateAttempts: 0
      }
    }
  }

  const loadActiveStaff = async (eventId: string) => {
    try {
      // Get active team members for this event
      const activeStaff = await TeamService.getActiveCheckInStaff(eventId)
      return activeStaff?.length || 0
    } catch (error) {
      console.error('Error loading active staff:', error)
      return 0
    }
  }

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an event to manage check-ins</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading check-in data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-in Management</h1>
          <p className="text-muted-foreground">
            Monitor real-time check-in activity and manage staff operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/dashboard/team">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Manage Staff
            </Button>
          </Link>
          <Button 
            onClick={() => setQrScannerActive(true)}
            className={qrScannerActive ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <QrCode className="w-4 h-4 mr-2" />
            {qrScannerActive ? 'Scanner Active' : 'Start Scanning'}
          </Button>
        </div>
      </div>

      {/* Event Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground">Managing check-ins for event:</div>
        <div className="font-medium">
          {event?.title || 'Loading event...'} 
          {event?.date && (
            <span className="text-sm text-muted-foreground ml-2">
              • {new Date(event.date).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {stats.totalTickets > 0 ? (
            `${stats.totalCheckins} of ${stats.totalTickets} tickets checked in (${stats.checkinPercentage}%)`
          ) : (
            'No tickets found for this event'
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeStaff}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
                <p className="text-2xl font-bold">{stats.totalCheckins}</p>
              </div>
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Check-in</p>
                <p className="text-2xl font-bold text-blue-600">{stats.lastCheckinTime}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duplicate Attempts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.duplicateAttempts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Status */}
      {qrScannerActive && (
        <Alert className="border-green-200 bg-green-50">
          <Smartphone className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            QR Scanner is active. Staff can now scan tickets for check-in. 
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setQrScannerActive(false)}
              className="ml-2 text-green-800 hover:text-green-900"
            >
              Stop Scanner
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <CheckinDashboard eventId={eventId} />

      {/* Development Note */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Development Note: This page integrates the CheckinDashboard component. 
          In production, the QR scanner would interface with mobile devices and camera APIs.
        </AlertDescription>
      </Alert>
    </div>
  )
}