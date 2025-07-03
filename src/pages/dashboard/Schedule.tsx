import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Plus
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface ScheduleEvent {
  id: string
  eventTitle: string
  role: 'check_in' | 'usher' | 'security' | 'coordinator' | 'setup'
  startTime: string
  endTime: string
  date: string
  location: string
  venue: string
  organizer: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  attendees: number
  duration: number // in hours
}

interface TeamMemberAssignment {
  id: string
  event_id: string
  role: string
  events: {
    id: string
    title: string
    date: string
    time: string
    location: string
    organization_name: string | null
    status: string
  }
}

export default function Schedule() {
  const { user } = useAuth()
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load real schedule data from database
  useEffect(() => {
    if (!user) return
    loadSchedule()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSchedule = async () => {
    if (!user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Query team_members table to get user's event assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('team_members')
        .select(`
          id,
          event_id,
          role,
          events (
            id,
            title,
            date,
            time,
            location,
            organization_name,
            status
          )
        `)
        .eq('user_id', user.id)
        .not('events', 'is', null)
        .order('events(date)', { ascending: true })

      if (assignmentsError) {
        console.error('Error loading schedule:', assignmentsError)
        setError('Failed to load schedule data')
        toast.error('Failed to load your schedule')
        return
      }

      // Transform database data to ScheduleEvent format
      const scheduleEvents: ScheduleEvent[] = (assignments as TeamMemberAssignment[]).map(assignment => {
        const event = assignment.events
        const eventDate = new Date(`${event.date}T${event.time}`)
        const endTime = new Date(eventDate.getTime() + 8 * 60 * 60 * 1000) // Default 8 hour duration
        
        return {
          id: assignment.id,
          eventTitle: event.title,
          role: assignment.role as 'check_in' | 'usher' | 'security' | 'coordinator' | 'setup',
          startTime: event.time,
          endTime: format(endTime, 'HH:mm'),
          date: event.date,
          location: event.location || 'TBD',
          venue: event.location || 'TBD',
          organizer: event.organization_name || 'Unknown',
          status: event.status === 'published' ? 'upcoming' : 'cancelled' as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
          attendees: 0, // This would need to be calculated from ticket sales
          duration: 8 // Default duration, could be calculated from event data
        }
      })

      setEvents(scheduleEvents)
    } catch (error) {
      console.error('Error loading schedule:', error)
      setError('Failed to load schedule data')
      toast.error('Failed to load your schedule')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter(event => event.date === dateStr)
  }

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const totalHoursThisWeek = () => {
    const weekDays = getWeekDays()
    return weekDays.reduce((total, day) => {
      const dayEvents = getEventsForDate(day)
      return total + dayEvents.reduce((dayTotal, event) => dayTotal + event.duration, 0)
    }, 0)
  }

  const nextWeek = () => {
    const nextWeekDate = new Date(currentWeek)
    nextWeekDate.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(nextWeekDate)
  }

  const prevWeek = () => {
    const prevWeekDate = new Date(currentWeek)
    prevWeekDate.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(prevWeekDate)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Calendar className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Schedule</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadSchedule}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Schedule</h1>
            <p className="mt-2 text-gray-600">
              View and manage your event work schedule
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Schedule Assignments</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You don't have any event assignments yet. Contact event organizers to get assigned to events as a team member.
            </p>
            <Button onClick={loadSchedule} variant="outline">
              Refresh Schedule
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Schedule</h1>
          <p className="mt-2 text-gray-600">
            View and manage your event work schedule
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week View</SelectItem>
              <SelectItem value="month">Month View</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoursThisWeek()}h</div>
            <p className="text-xs text-muted-foreground">
              Total work hours
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getEventsForDate(new Date()).length}</div>
            <p className="text-xs text-muted-foreground">
              Events scheduled
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.status === 'upcoming').length}
            </div>
            <p className="text-xs text-muted-foreground">
              In next 30 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Assignment</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(() => {
              const nextEvent = events
                .filter(e => e.status === 'upcoming')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
              
              return nextEvent ? (
                <>
                  <div className="text-sm font-bold text-primary">{nextEvent.eventTitle}</div>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(nextEvent.date), 'MMM dd')} at {nextEvent.startTime}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">None</div>
                  <p className="text-xs text-muted-foreground">No upcoming events</p>
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Schedule View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {viewMode === 'week' ? 'Weekly Schedule' : 'Monthly Calendar'}
                </CardTitle>
                {viewMode === 'week' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevWeek}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[140px] text-center">
                      {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                    </span>
                    <Button variant="outline" size="sm" onClick={nextWeek}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'week' ? (
                <div className="space-y-4">
                  {getWeekDays().map((day) => {
                    const dayEvents = getEventsForDate(day)
                    const isToday = isSameDay(day, new Date())
                    
                    return (
                      <div key={day.toISOString()} className={`border rounded-lg p-4 ${isToday ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                              {format(day, 'EEEE')}
                            </h3>
                            <span className={`text-sm ${isToday ? 'text-primary' : 'text-gray-500'}`}>
                              {format(day, 'MMM dd')}
                            </span>
                            {isToday && (
                              <Badge variant="secondary" className="text-xs">Today</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {dayEvents.reduce((total, event) => total + event.duration, 0)}h total
                          </div>
                        </div>
                        
                        {dayEvents.length === 0 ? (
                          <div className="text-sm text-gray-400 italic">No events scheduled</div>
                        ) : (
                          <div className="space-y-2">
                            {dayEvents.map((event) => (
                              <div key={event.id} className={`border rounded p-3 ${getStatusColor(event.status)}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm">{event.eventTitle}</h4>
                                       <Badge className={getRoleColor(event.role)}>
                                        {getRoleName(event.role)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {event.startTime} - {event.endTime}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {event.location}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {event.attendees}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Month view coming soon...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mini Calendar and Quick Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  hasEvent: (date) => getEventsForDate(date).length > 0
                }}
                modifiersStyles={{
                  hasEvent: {
                    backgroundColor: 'rgb(59 130 246 / 0.1)',
                    color: 'rgb(59 130 246)',
                    fontWeight: 'bold'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, MMM dd')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const selectedEvents = getEventsForDate(selectedDate)
                
                if (selectedEvents.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No events scheduled</p>
                    </div>
                  )
                }
                
                return (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <div key={event.id} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm">{event.eventTitle}</h4>
                          <Badge className={getRoleColor(event.role)}>
                            {getRoleName(event.role)}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.startTime} - {event.endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}