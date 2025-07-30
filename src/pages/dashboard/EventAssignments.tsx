import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  QrCode,
  Eye,
  MessageSquare
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatEventDate } from '@/lib/utils/dateUtils'

interface EventAssignment {
  id: string
  eventTitle: string
  eventId: string
  role: 'check_in' | 'usher' | 'security' | 'coordinator' | 'setup'
  startTime: string
  endTime: string
  date: string
  location: string
  venue: string
  organizer: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  attendees: number
  instructions?: string
  checkInCount?: number
  lastActivity?: string
}

interface AssignmentStats {
  totalAssignments: number
  upcomingAssignments: number
  completedAssignments: number
  hoursWorked: number
  eventsThisMonth: number
  checkInsProcessed: number
}

export default function EventAssignments() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<EventAssignment[]>([])
  const [stats, setStats] = useState<AssignmentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Mock data for demonstration
  useEffect(() => {
    const loadAssignments = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockStats: AssignmentStats = {
        totalAssignments: 15,
        upcomingAssignments: 3,
        completedAssignments: 10,
        hoursWorked: 42,
        eventsThisMonth: 5,
        checkInsProcessed: 287
      }
      
      const mockAssignments: EventAssignment[] = [
        {
          id: '1',
          eventTitle: 'Summer Music Festival',
          eventId: 'event-1',
          role: 'check_in',
          startTime: '14:00',
          endTime: '22:00',
          date: '2024-07-15',
          location: 'Main Gate',
          venue: 'Central Park Amphitheater',
          organizer: 'Music Events Co.',
          status: 'upcoming',
          attendees: 500,
          instructions: 'Check tickets and wristbands at main entrance. Arrive 30 minutes early for briefing.',
          checkInCount: 0
        },
        {
          id: '2',
          eventTitle: 'Tech Conference 2024',
          eventId: 'event-2',
          role: 'usher',
          startTime: '08:00',
          endTime: '17:00',
          date: '2024-02-20',
          location: 'Main Hall',
          venue: 'Convention Center',
          organizer: 'TechEvents Inc.',
          status: 'upcoming',
          attendees: 200,
          instructions: 'Guide attendees to sessions and assist with seating.'
        },
        {
          id: '3',
          eventTitle: 'Food & Wine Expo',
          eventId: 'event-3',
          role: 'check_in',
          startTime: '10:00',
          endTime: '18:00',
          date: '2024-01-10',
          location: 'Front Desk',
          venue: 'Expo Center',
          organizer: 'Culinary Events',
          status: 'completed',
          attendees: 150,
          checkInCount: 142,
          lastActivity: '2024-01-10 18:00'
        },
        {
          id: '4',
          eventTitle: 'Charity Gala',
          eventId: 'event-4',
          role: 'coordinator',
          startTime: '17:00',
          endTime: '23:00',
          date: '2024-01-05',
          location: 'VIP Area',
          venue: 'Grand Hotel Ballroom',
          organizer: 'Charity Foundation',
          status: 'completed',
          attendees: 100,
          lastActivity: '2024-01-05 23:00'
        }
      ]
      
      setStats(mockStats)
      setAssignments(mockAssignments)
      setIsLoading(false)
    }

    loadAssignments()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'check_in':
        return 'bg-purple-100 text-purple-800'
      case 'usher':
        return 'bg-blue-100 text-blue-800'
      case 'security':
        return 'bg-red-100 text-red-800'
      case 'coordinator':
        return 'bg-green-100 text-green-800'
      case 'setup':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'check_in':
        return 'Check-in'
      case 'usher':
        return 'Usher'
      case 'security':
        return 'Security'
      case 'coordinator':
        return 'Coordinator'
      case 'setup':
        return 'Setup'
      default:
        return role
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <CheckCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Assignments</h1>
          <p className="mt-2 text-gray-600">
            Manage your event work assignments and schedules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/schedule">
              <Calendar className="mr-2 h-4 w-4" />
              View Schedule
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/checkin">
              <QrCode className="mr-2 h-4 w-4" />
              Check-in Tools
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.upcomingAssignments} upcoming
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.hoursWorked}</div>
            <p className="text-xs text-muted-foreground">
              This month: {stats?.eventsThisMonth} events
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Processed</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.checkInsProcessed}</div>
            <p className="text-xs text-muted-foreground">
              Total tickets scanned
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && Math.round((stats.completedAssignments / stats.totalAssignments) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedAssignments} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
          <CardDescription>
            All your event work assignments and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming ({assignments.filter(a => a.status === 'upcoming').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({assignments.filter(a => a.status === 'completed').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.eventTitle}</div>
                          <div className="text-sm text-gray-500">{assignment.organizer}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(assignment.role)}>
                          {getRoleName(assignment.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatEventDate(assignment.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assignment.startTime} - {assignment.endTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <div>
                            <div className="text-sm">{assignment.location}</div>
                            <div className="text-xs text-gray-500">{assignment.venue}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span>{assignment.attendees}</span>
                        </div>
                        {assignment.checkInCount !== undefined && (
                          <div className="text-xs text-gray-500">
                            {assignment.checkInCount} checked in
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(assignment.status)}
                          <Badge className={getStatusColor(assignment.status)}>
                            {assignment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {assignment.status === 'upcoming' && assignment.role === 'check_in' && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/dashboard/checkin">
                                <QrCode className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Next Assignment Alert */}
      {assignments.some(a => a.status === 'upcoming') && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Next Assignment</h3>
                {(() => {
                  const nextAssignment = assignments
                    .filter(a => a.status === 'upcoming')
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
                  
                  return nextAssignment ? (
                    <p className="text-sm text-muted-foreground">
                      {nextAssignment.eventTitle} on {formatEventDate(nextAssignment.date)} 
                      at {nextAssignment.startTime} as {getRoleName(nextAssignment.role)}
                    </p>
                  ) : null
                })()}
              </div>
            </div>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}