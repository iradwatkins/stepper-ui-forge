// Team Member Dashboard for followers with event working permissions
// Shows event schedule, QR scanner, check-in tools, and team activities

import React, { useState, useEffect } from 'react'
import { Calendar, QrCode, Users, Clock, CheckCircle, AlertCircle, Scan, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QRScanner } from '@/components/QRScanner'
import { FollowerService } from '@/lib/services/FollowerService'

interface TeamMemberDashboardProps {
  userId: string
}

interface EventAssignment {
  event_id: string
  event_title: string
  event_date: string
  event_time: string
  event_location: string
  organizer_name: string
  role: string
  permissions: string[]
}

interface CheckInActivity {
  id: string
  ticket_id: string
  attendee_name: string
  attendee_email: string
  checked_in_at: string
  event_title: string
}

interface TeamStats {
  eventsWorked: number
  ticketsScanned: number
  hoursWorked: number
  upcomingEvents: number
}

export function TeamMemberDashboard({ userId }: TeamMemberDashboardProps) {
  const [eventAssignments, setEventAssignments] = useState<EventAssignment[]>([])
  const [checkInActivities, setCheckInActivities] = useState<CheckInActivity[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats>({
    eventsWorked: 0,
    ticketsScanned: 0,
    hoursWorked: 0,
    upcomingEvents: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventAssignment | null>(null)

  useEffect(() => {
    loadTeamMemberData()
  }, [userId])

  const loadTeamMemberData = async () => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Implement services to fetch team member data
      // For now, using mock data
      const mockAssignments: EventAssignment[] = []
      const mockActivities: CheckInActivity[] = []
      const mockStats: TeamStats = {
        eventsWorked: 0,
        ticketsScanned: 0,
        hoursWorked: 0,
        upcomingEvents: 0
      }

      setEventAssignments(mockAssignments)
      setCheckInActivities(mockActivities)
      setTeamStats(mockStats)

    } catch (err) {
      console.error('Failed to load team member data:', err)
      setError('Failed to load team member data')
    } finally {
      setLoading(false)
    }
  }

  const handleQRScan = async (scannedCode: string) => {
    try {
      // TODO: Implement ticket validation logic
      console.log('Scanned QR code:', scannedCode)
      setShowQRScanner(false)
      // Show success message
    } catch (err) {
      console.error('Failed to process QR scan:', err)
      setError('Failed to validate ticket')
    }
  }

  const getEventStatus = (eventDate: string, eventTime: string) => {
    const eventDateTime = new Date(`${eventDate} ${eventTime}`)
    const now = new Date()
    const diffHours = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours < -2) return { status: 'completed', color: 'bg-gray-100 text-gray-800' }
    if (diffHours < 0) return { status: 'in-progress', color: 'bg-green-100 text-green-800' }
    if (diffHours < 24) return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' }
    return { status: 'scheduled', color: 'bg-gray-100 text-gray-800' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading team dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => setShowQRScanner(true)}
          className="flex items-center gap-2"
        >
          <QrCode className="h-4 w-4" />
          Scan Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.eventsWorked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Scanned</CardTitle>
            <Scan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.ticketsScanned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.hoursWorked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.upcomingEvents}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Event Schedule</TabsTrigger>
          <TabsTrigger value="checkins">Check-in History</TabsTrigger>
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Your Event Schedule</CardTitle>
              <CardDescription>
                Events you're assigned to work
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No events assigned</h3>
                  <p className="text-gray-600">Event organizers will assign you to events when they need help.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventAssignments.map((assignment) => {
                      const eventStatus = getEventStatus(assignment.event_date, assignment.event_time)
                      return (
                        <TableRow key={assignment.event_id}>
                          <TableCell className="font-medium">
                            {assignment.event_title}
                          </TableCell>
                          <TableCell>{assignment.organizer_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(assignment.event_date).toLocaleDateString()}</div>
                              <div className="text-gray-500">{assignment.event_time}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{assignment.event_location}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={eventStatus.color}>
                              {eventStatus.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkins">
          <Card>
            <CardHeader>
              <CardTitle>Check-in History</CardTitle>
              <CardDescription>
                Recent ticket scans and check-in activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkInActivities.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No check-ins yet</h3>
                  <p className="text-gray-600">Start scanning tickets to see your check-in history here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkInActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{activity.attendee_name}</div>
                            <div className="text-sm text-gray-500">{activity.attendee_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{activity.event_title}</TableCell>
                        <TableCell>
                          {new Date(activity.checked_in_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Checked In
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scanner">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Scanner</CardTitle>
              <CardDescription>
                Scan tickets to check in attendees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventAssignments.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Event</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={selectedEvent?.event_id || ''}
                      onChange={(e) => {
                        const event = eventAssignments.find(a => a.event_id === e.target.value)
                        setSelectedEvent(event || null)
                      }}
                    >
                      <option value="">Select an event...</option>
                      {eventAssignments.map((assignment) => (
                        <option key={assignment.event_id} value={assignment.event_id}>
                          {assignment.event_title} - {new Date(assignment.event_date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <Button 
                  onClick={() => setShowQRScanner(true)}
                  disabled={!selectedEvent}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Start Scanning
                </Button>

                {!selectedEvent && eventAssignments.length > 0 && (
                  <p className="text-sm text-gray-600 text-center">
                    Please select an event before scanning tickets
                  </p>
                )}

                {eventAssignments.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to be assigned to an event before you can scan tickets.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Scanner Dialog */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Ticket QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the ticket QR code to check in the attendee
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <QRScanner onScan={handleQRScan} />
            <Button
              variant="outline"
              onClick={() => setShowQRScanner(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}