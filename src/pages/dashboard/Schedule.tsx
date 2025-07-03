import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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

export default function Schedule() {
  const { user } = useAuth()
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [isLoading, setIsLoading] = useState(true)

  // Mock data for demonstration
  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockEvents: ScheduleEvent[] = [
        {
          id: '1',
          eventTitle: 'Summer Music Festival',
          role: 'check_in',
          startTime: '14:00',
          endTime: '22:00',
          date: '2024-07-15',
          location: 'Main Gate',
          venue: 'Central Park Amphitheater',
          organizer: 'Music Events Co.',
          status: 'upcoming',
          attendees: 500,
          duration: 8
        },
        {
          id: '2',
          eventTitle: 'Tech Conference 2024',
          role: 'usher',
          startTime: '08:00',
          endTime: '17:00',
          date: '2024-02-20',
          location: 'Main Hall',
          venue: 'Convention Center',
          organizer: 'TechEvents Inc.',
          status: 'upcoming',
          attendees: 200,
          duration: 9
        },
        {
          id: '3',
          eventTitle: 'Food & Wine Expo',
          role: 'check_in',
          startTime: '10:00',
          endTime: '18:00',
          date: format(new Date(), 'yyyy-MM-dd'), // Today
          location: 'Front Desk',
          venue: 'Expo Center',
          organizer: 'Culinary Events',
          status: 'in_progress',
          attendees: 150,
          duration: 8
        },
        {
          id: '4',
          eventTitle: 'Charity Gala',
          role: 'coordinator',
          startTime: '17:00',
          endTime: '23:00',
          date: '2024-02-18',
          location: 'VIP Area',
          venue: 'Grand Hotel Ballroom',
          organizer: 'Charity Foundation',
          status: 'upcoming',
          attendees: 100,
          duration: 6
        },
        {
          id: '5',
          eventTitle: 'Weekend Market',
          role: 'setup',
          startTime: '06:00',
          endTime: '09:00',
          date: '2024-02-17',
          location: 'Market Square',
          venue: 'Downtown Plaza',
          organizer: 'Market Association',
          status: 'upcoming',
          attendees: 50,
          duration: 3
        }
      ]
      
      setEvents(mockEvents)
      setIsLoading(false)
    }

    loadSchedule()
  }, [])

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